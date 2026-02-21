import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { LedgerService } from '@/lib/services/ledger-service';

/**
 * POST /api/admin/wallet-action
 * Body: { shopId, action: 'freeze' | 'unfreeze', reason }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { shopId, action, reason } = body;

    if (!shopId || !action || !reason) {
      return NextResponse.json(
        { message: 'shopId, action, and reason are required' },
        { status: 400 }
      );
    }

    if (action === 'freeze') {
      await LedgerService.freezeWallet(shopId, reason, session.user.id);
      return NextResponse.json({ success: true, message: `Wallet frozen. Reason: ${reason}` });
    }

    if (action === 'unfreeze') {
      await LedgerService.unfreezeWallet(shopId, reason, session.user.id);
      return NextResponse.json({ success: true, message: `Wallet unfrozen. Reason: ${reason}` });
    }

    return NextResponse.json({ message: 'Invalid action. Use "freeze" or "unfreeze".' }, { status: 400 });
  } catch (error: any) {
    console.error('Wallet action error:', error);
    return NextResponse.json(
      { message: 'Failed to perform wallet action', error: error.message },
      { status: 500 }
    );
  }
}
