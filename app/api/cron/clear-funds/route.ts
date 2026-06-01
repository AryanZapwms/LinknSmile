// app/api/cron/clear-funds/route.ts
// Runs on a schedule (e.g. daily via Vercel Cron or external cron)
// Releases vendor payouts that have been pending for 7+ days after delivery
// Also updates wallet balances accordingly

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/order';
import { Wallet } from '@/lib/models/wallet';
import { LedgerEntry } from '@/lib/models/ledger';
import mongoose from 'mongoose';

const HOLD_DAYS = 7;

export async function GET(req: NextRequest) {
  // Protect the cron endpoint
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - HOLD_DAYS);

    // Find delivered orders with pending payouts where delivery was 7+ days ago
    const orders = await Order.find({
      orderStatus: 'delivered',
      'vendorPayouts.status': 'pending',
      updatedAt: { $lte: cutoffDate },
    });

    let released = 0;
    let errors = 0;

    for (const order of orders) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const payout of order.vendorPayouts as any[]) {
            if (payout.status !== 'pending') continue;
            if (!payout.shopId) continue;

            // Check if the order was updated (delivered) 7+ days ago
            const deliveredAt = payout.deliveredAt || order.updatedAt;
            const daysSinceDelivery =
              (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDelivery < HOLD_DAYS) continue;

            // Mark payout as released
            payout.status = 'released';
            payout.releasedAt = new Date();

            // Find or create wallet for this vendor
            let wallet = await Wallet.findOne({
              shopId: payout.shopId,
              type: 'VENDOR',
            }).session(session);

            if (!wallet) {
              [wallet] = await Wallet.create(
                [{ shopId: payout.shopId, type: 'VENDOR', status: 'ACTIVE' }],
                { session }
              );
            }

            if (wallet.status === 'FROZEN' || wallet.status === 'CLOSED') continue;

            // Move amount from pending → withdrawable
            const amount = payout.amount || 0;
            wallet.pendingBalance = Math.max(0, (wallet.pendingBalance || 0) - amount);
            wallet.withdrawableBalance = (wallet.withdrawableBalance || 0) + amount;
            wallet.lastReconciledAt = new Date();
            await wallet.save({ session });

            // Create ledger entry
            await LedgerEntry.create(
              [
                {
                  accountId: wallet._id,
                  type: 'CREDIT',
                  amount,
                  status: 'CLEARED',
                  description: `Order #${order.orderNumber} — earnings released`,
                  referenceType: 'ORDER',
                  referenceId: order._id,
                },
              ],
              { session }
            );

            released++;
          }

          await order.save({ session });
        });
      } catch (err) {
        console.error(`[CronClearFunds] Error processing order ${order._id}:`, err);
        errors++;
      } finally {
        session.endSession();
      }
    }

    console.log(`[CronClearFunds] Released ${released} payouts, ${errors} errors`);

    return NextResponse.json({
      success: true,
      released,
      errors,
      processedOrders: orders.length,
      message: `Released ${released} vendor payouts`,
    });
  } catch (error: any) {
    console.error('[CronClearFunds] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}