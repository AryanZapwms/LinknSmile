import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Payout from '@/lib/models/payout';
import { Order } from '@/lib/models/order';
import Shop from '@/lib/models/shop';
import { LedgerService } from '@/lib/services/ledger-service';
import { sendEmail, getPayoutStatusEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const shopId = searchParams.get('shopId');

    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (shopId) query.shopId = shopId;

    const payouts = await Payout.find(query)
      .populate('shopId', 'shopName bankDetails')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, payouts });
  } catch (error: any) {
    console.error('Admin fetch payouts error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch payouts', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { payoutId, action, transactionId, failureReason, notes } = body;

    const payout = await Payout.findById(payoutId);
    if (!payout) {
      return NextResponse.json({ message: 'Payout request not found' }, { status: 404 });
    }

    let nextStatus = payout.status;
    const updateFields: any = {};

    if (action === 'approve') {
      // Approve → APPROVED state. LedgerService deducts balance now (locks it).
      if (payout.status !== 'REQUESTED') {
        return NextResponse.json({ message: 'Only REQUESTED payouts can be approved' }, { status: 400 });
      }
      nextStatus = 'APPROVED';
      updateFields.approvedBy = session.user.id;
      updateFields.approvedAt = new Date();

      // Deduct from wallet via ledger (idempotent)
      await LedgerService.requestPayout({
        shopId: payout.shopId.toString(),
        amount: payout.amount,
        payoutId: payout._id.toString(),
        adminId: session.user.id,
      });

    } else if (action === 'complete') {
      if (!transactionId) {
        return NextResponse.json({ message: 'Bank transaction ID is required' }, { status: 400 });
      }
      if (!['APPROVED', 'PROCESSING'].includes(payout.status)) {
        return NextResponse.json({ message: 'Only APPROVED or PROCESSING payouts can be completed' }, { status: 400 });
      }
      nextStatus = 'COMPLETED';
      updateFields.transactionId = transactionId;
      updateFields.processedAt = new Date();

      // Mark ledger entry as CLEARED
      await LedgerService.completePayout(payout._id.toString(), session.user.id, transactionId);

      // Update associated order vendorPayout status
      await Order.updateMany(
        { _id: { $in: payout.orderIds }, 'vendorPayouts.shopId': payout.shopId },
        { $set: { 'vendorPayouts.$.status': 'released' } }
      );

    } else if (action === 'reject') {
      if (!failureReason) {
        return NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 });
      }
      if (payout.status === 'COMPLETED') {
        return NextResponse.json({ message: 'Cannot reject a completed payout' }, { status: 400 });
      }
      nextStatus = 'FAILED';
      updateFields.failureReason = failureReason;

      // Reverse ledger debit — restore withdrawable balance
      // Only if wallet was already debited (i.e., was APPROVED or PROCESSING)
      if (['APPROVED', 'PROCESSING'].includes(payout.status)) {
        await LedgerService.rejectPayout(
          payout._id.toString(),
          payout.shopId.toString(),
          payout.amount,
          failureReason,
          session.user.id
        );
      }

      // Revert order payout status
      await Order.updateMany(
        { _id: { $in: payout.orderIds }, 'vendorPayouts.shopId': payout.shopId },
        { $set: { 'vendorPayouts.$.status': 'pending' } }
      );
    }

    if (notes) updateFields.notes = notes;

    const updatedPayout = await Payout.findByIdAndUpdate(
      payoutId,
      { status: nextStatus, ...updateFields },
      { new: true }
    );

    // Notify vendor via email
    try {
      const vendorShop = await Shop.findById(payout.shopId).populate('ownerId');
      if (vendorShop && (vendorShop.ownerId as any)?.email) {
        await sendEmail({
          to: (vendorShop.ownerId as any).email,
          subject: `Payout Update: ${nextStatus}`,
          html: getPayoutStatusEmail({
            shopName: vendorShop.shopName,
            amount: payout.amount,
            status: nextStatus.toLowerCase(),
            transactionId,
            failureReason,
          }),
        });
      }
    } catch (emailError) {
      console.error('Failed to send payout status email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: `Payout ${nextStatus.toLowerCase()} successfully`,
      payout: updatedPayout,
    });
  } catch (error: any) {
    console.error('Admin update payout error:', error);
    return NextResponse.json(
      { message: 'Failed to update payout', error: error.message },
      { status: 500 }
    );
  }
}
