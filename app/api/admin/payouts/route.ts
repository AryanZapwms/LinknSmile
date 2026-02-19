import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Payout from '@/lib/models/payout';
import { Order } from '@/lib/models/order';
import Shop from '@/lib/models/shop';
import User from '@/lib/models/user';
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

    return NextResponse.json({
      success: true,
      payouts
    });
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
    let updateFields: any = {};

    if (action === 'approve') {
      nextStatus = 'processing';
    } else if (action === 'complete') {
      if (!transactionId) {
        return NextResponse.json({ message: 'Transaction ID is required for completion' }, { status: 400 });
      }
      nextStatus = 'completed';
      updateFields = {
        transactionId,
        processedDate: new Date(),
      };
      
      // Update associated orders to 'released'
      await Order.updateMany(
        { _id: { $in: payout.orderIds }, 'vendorPayouts.shopId': payout.shopId },
        { $set: { 'vendorPayouts.$.status': 'released' } }
      );
    } else if (action === 'reject') {
      if (!failureReason) {
        return NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 });
      }
      nextStatus = 'failed';
      updateFields = { failureReason };

      // Revert associated orders to 'pending'
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

    // Send email to vendor
    try {
        const vendorShop = await Shop.findById(payout.shopId).populate('ownerId');
        if (vendorShop && (vendorShop.ownerId as any)?.email) {
            await sendEmail({
                to: (vendorShop.ownerId as any).email,
                subject: `Payout Request Update: ${nextStatus.toUpperCase()}`,
                html: getPayoutStatusEmail({
                    shopName: vendorShop.shopName,
                    amount: payout.amount,
                    status: nextStatus,
                    transactionId,
                    failureReason
                })
            });
        }
    } catch (emailError) {
        console.error('Failed to send payout status email to vendor:', emailError);
    }

    console.log(`Payout ${payoutId} updated to ${nextStatus} by Admin`);

    return NextResponse.json({
      success: true,
      message: `Payout request ${nextStatus} successfully`,
      payout: updatedPayout
    });

  } catch (error: any) {
    console.error('Admin update payout error:', error);
    return NextResponse.json(
      { message: 'Failed to update payout', error: error.message },
      { status: 500 }
    );
  }
}
