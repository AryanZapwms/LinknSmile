/**
 * GET /api/admin/wallet-overview
 *
 * Returns:
 * - Total vendor liability (sum of all wallet balances)
 * - Pending vs withdrawable breakdown
 * - Frozen wallets
 * - Platform commission earned
 * - Total paid out
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Wallet } from '@/lib/models/wallet';
import Payout from '@/lib/models/payout';
import { LedgerEntry } from '@/lib/models/ledger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Aggregate all vendor wallets
    const walletStats = await Wallet.aggregate([
      { $match: { type: 'VENDOR' } },
      {
        $group: {
          _id: null,
          totalVendors: { $sum: 1 },
          totalPendingLiability: { $sum: '$pendingBalance' },
          totalWithdrawableLiability: { $sum: '$withdrawableBalance' },
          totalFrozenAmount: { $sum: '$frozenBalance' },
          activeWallets: {
            $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] },
          },
          frozenWallets: {
            $sum: { $cond: [{ $eq: ['$status', 'FROZEN'] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = walletStats[0] || {
      totalVendors: 0,
      totalPendingLiability: 0,
      totalWithdrawableLiability: 0,
      totalFrozenAmount: 0,
      activeWallets: 0,
      frozenWallets: 0,
    };

    const totalVendorLiability =
      stats.totalPendingLiability + stats.totalWithdrawableLiability;

    // Platform commission earned
    const platformWallet = await Wallet.findOne({ type: 'PLATFORM_REVENUE' });
    const platformRevenue = platformWallet?.withdrawableBalance || 0;

    // Total paid out (completed payouts)
    const payoutTotals = await Payout.aggregate([
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const payoutBreakdown: Record<string, { total: number; count: number }> = {};
    payoutTotals.forEach((p) => {
      payoutBreakdown[p._id] = { total: p.total, count: p.count };
    });

    // Pending payouts awaiting admin action
    const pendingPayouts = await Payout.find({
      status: { $in: ['REQUESTED', 'APPROVED', 'PROCESSING'] },
    })
      .populate('shopId', 'shopName')
      .sort({ createdAt: 1 })
      .limit(20);

    // Recent ledger activity (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await LedgerEntry.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      overview: {
        totalVendorLiability,
        totalPendingLiability: stats.totalPendingLiability,
        totalWithdrawableLiability: stats.totalWithdrawableLiability,
        totalFrozenAmount: stats.totalFrozenAmount,
        platformRevenue,
        vendorCount: stats.totalVendors,
        activeWallets: stats.activeWallets,
        frozenWallets: stats.frozenWallets,
      },
      payoutBreakdown,
      pendingPayouts,
      recentActivity,
    });
  } catch (error: any) {
    console.error('Admin wallet overview error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch wallet overview', error: error.message },
      { status: 500 }
    );
  }
}
