import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/order';
import Payout from '@/lib/models/payout';
import { Wallet } from '@/lib/models/wallet';
import { LedgerEntry } from '@/lib/models/ledger';
import { LedgerService } from '@/lib/services/ledger-service'; // ← ADDED
import Shop from '@/lib/models/shop';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { sendEmail, getPayoutRequestedEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const shopId = session.user.shopId;
    if (!shopId) return NextResponse.json({ message: 'Shop not found' }, { status: 404 });

    // Get wallet (source of truth for balances)
    let wallet = await Wallet.findOne({ shopId, type: 'VENDOR' });
    if (!wallet) {
      wallet = await Wallet.create({ shopId, type: 'VENDOR' });
    }

    // Get payout history
    const payouts = await Payout.find({ shopId }).sort({ createdAt: -1 }).limit(50);

    // Get recent ledger entries for transaction history
    const transactions = await LedgerEntry.find({ accountId: wallet._id })
      .sort({ createdAt: -1 })
      .limit(30);

    return NextResponse.json({
      success: true,
      wallet: {
        pendingBalance: wallet.pendingBalance,
        withdrawableBalance: wallet.withdrawableBalance,
        frozenBalance: wallet.frozenBalance,
        minimumThreshold: wallet.minimumThreshold,
        status: wallet.status,
        lastReconciledAt: wallet.lastReconciledAt,
      },
      payouts,
      transactions,
    });
  } catch (error: any) {
    console.error('Fetch payouts error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch payouts', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const shopId = session.user.shopId;
    const body = await req.json();
    const { amount, notes } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ message: 'Invalid amount' }, { status: 400 });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) return NextResponse.json({ message: 'Shop not found' }, { status: 404 });

    if (!shop.bankDetails?.accountNumber) {
      return NextResponse.json({
        message: 'Please add your bank account details in Settings before requesting a payout',
      }, { status: 400 });
    }

    // Get wallet — must be ACTIVE
    const wallet = await Wallet.findOne({ shopId, type: 'VENDOR' });
    if (!wallet) {
      return NextResponse.json({ message: 'Wallet not found. No earnings yet.' }, { status: 400 });
    }

    if (wallet.status === 'FROZEN') {
      return NextResponse.json({
        message: 'Your wallet is currently frozen. Please contact support.',
      }, { status: 400 });
    }

    if (wallet.status === 'CLOSED') {
      return NextResponse.json({ message: 'Your account is closed.' }, { status: 400 });
    }

    // Threshold check
    const threshold = wallet.minimumThreshold || 500;
    if (amount < threshold) {
      return NextResponse.json({
        message: `Minimum withdrawal amount is ₹${threshold}`,
      }, { status: 400 });
    }

    // Balance check — only withdrawable (not pending, not frozen)
    if (amount > wallet.withdrawableBalance) {
      return NextResponse.json({
        message: `Insufficient withdrawable balance. Available: ₹${wallet.withdrawableBalance.toFixed(2)}`,
      }, { status: 400 });
    }

    // Check no REQUESTED or APPROVED payout already in flight
    const inFlight = await Payout.findOne({
      shopId,
      status: { $in: ['REQUESTED', 'APPROVED', 'PROCESSING'] },
    });
    if (inFlight) {
      return NextResponse.json({
        message: `You already have a payout request in progress (₹${inFlight.amount}). Please wait for it to complete.`,
      }, { status: 400 });
    }

    // FIX 1: Deterministic idempotency key — same day + amount = same key
    // Prevents double-spend from double-clicks or network retries
    const today = new Date().toISOString().slice(0, 10); // e.g. "2025-02-21"
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${shopId}|${amount}|${today}`)
      .digest('hex');

    // FIX 1 cont: Return existing payout if key already exists (idempotent response)
    const existingPayout = await Payout.findOne({ idempotencyKey });
    if (existingPayout) {
      return NextResponse.json({
        success: true,
        message: 'Payout request already submitted.',
        payout: existingPayout,
      });
    }

    // Collect order IDs with pending vendor payouts (informational, not required)
    const orders = await Order.find({
      'vendorPayouts.shopId': new mongoose.Types.ObjectId(shopId),
      'vendorPayouts.status': 'pending',
      orderStatus: 'delivered',
      paymentStatus: 'completed',
    }).select('_id');
    const orderIds = orders.map((o) => o._id);

    const payout = await Payout.create({
      shopId: new mongoose.Types.ObjectId(shopId),
      amount,
      idempotencyKey,
      status: 'REQUESTED',
      bankAccountNumber: shop.bankDetails?.accountNumber
        ? `****${shop.bankDetails.accountNumber.slice(-4)}`
        : undefined,
      bankIfsc: shop.bankDetails?.ifsc,
      bankName: shop.bankDetails?.bankName,
      orderIds,
      notes,
    });

    // FIX 2: Debit wallet via ledger immediately (prevents double-spend window)
    // If ledger fails, cancel the payout record and surface the error cleanly
    try {
      await LedgerService.requestPayout({
        shopId: shopId.toString(),
        amount,
        payoutId: payout._id.toString(),
      });
    } catch (ledgerError: any) {
      // Rollback: mark payout as CANCELLED so it doesn't sit as a ghost record
      await Payout.findByIdAndUpdate(payout._id, {
        status: 'CANCELLED',
        failureReason: `Ledger error: ${ledgerError.message}`,
      });
      console.error('[Payout] Ledger debit failed, payout cancelled:', ledgerError);
      return NextResponse.json(
        { message: `Failed to process payout: ${ledgerError.message}` },
        { status: 500 }
      );
    }

    // Notify admin
    try {
      await sendEmail({
        to: process.env.GMAIL_EMAIL!,
        subject: `New Payout Request: ₹${amount} from ${shop.shopName}`,
        html: getPayoutRequestedEmail({
          shopName: shop.shopName,
          amount,
          requestId: payout._id.toString(),
        }),
      });
    } catch (emailError) {
      // Email failure is non-critical — payout is already created and ledger debited
      console.error('Failed to send payout request email to admin:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted. Admin will process it shortly.',
      payout,
    });
  } catch (error: any) {
    console.error('Payout request error:', error);
    return NextResponse.json(
      { message: 'Failed to submit payout request', error: error.message },
      { status: 500 }
    );
  }
}