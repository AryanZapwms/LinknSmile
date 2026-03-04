// app/api/vendor/wallet/ledger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { LedgerEntry } from '@/lib/models/ledger';
import { Wallet } from '@/lib/models/wallet';
import Shop from '@/lib/models/shop';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const shopId = session.user.shopId;
    if (!shopId) {
      return NextResponse.json({ error: 'Shop not found in session' }, { status: 404 });
    }

    // Find wallet for this vendor
    const wallet = await Wallet.findOne({ shopId, type: 'VENDOR' });
    if (!wallet) {
      return NextResponse.json({ entries: [], total: 0 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      LedgerEntry.find({ accountId: wallet._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LedgerEntry.countDocuments({ accountId: wallet._id }),
    ]);

    return NextResponse.json({
      entries: entries.map((e) => ({
        _id: e._id.toString(),
        type: e.type,
        amount: e.amount,
        status: e.status,
        description: e.description,
        createdAt: e.createdAt,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[VendorLedger GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}