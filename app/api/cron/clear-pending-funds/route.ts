/**
 * GET /api/cron/clear-pending-funds
 *
 * Called daily by Vercel Cron (see vercel.json).
 * Moves vendor ledger entries from PENDING → CLEARED if their
 * clearAt date (T+7 from sale) has passed and there's no active dispute.
 *
 * Protected by CRON_SECRET env variable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { LedgerService } from '@/lib/services/ledger-service';
import { AuditLog } from '@/lib/models/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggering
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const startedAt = new Date();
    const result = await LedgerService.clearPendingFunds();

    await AuditLog.create({
      action: 'CRON_CLEAR_PENDING_FUNDS',
      performedBy: 'SYSTEM',
      targetEntity: 'LedgerEntry',
      metadata: {
        ...result,
        startedAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.cleared} entries. Failed: ${result.failed}.`,
      ...result,
    });
  } catch (error: any) {
    console.error('[Cron] clearPendingFunds error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}
