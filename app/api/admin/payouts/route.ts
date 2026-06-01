import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Payout from '@/lib/models/payout';
import { Order } from '@/lib/models/order';
import Shop from '@/lib/models/shop';
import { LedgerService } from '@/lib/services/ledger-service';
import { sendEmail, getPayoutStatusEmail } from '@/lib/email';
import { sendPushNotificationToVendor } from '@/lib/services/push-notification';

export async function GET(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return withCORS(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
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

    return withCORS(NextResponse.json({ success: true, payouts }));
  } catch (error: any) {
    console.error('Admin fetch payouts error:', error);
    return withCORS(NextResponse.json(
      { message: 'Failed to fetch payouts', error: error.message },
      { status: 500 }
    ));
  }
}

export async function PUT(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return withCORS(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
    }

    await connectDB();
    // Renamed to avoid conflict with notification body variable
    const requestBody = await req.json();
    const { payoutId, action, transactionId, failureReason, notes } = requestBody;

    const payout = await Payout.findById(payoutId);
    if (!payout) {
      return withCORS(NextResponse.json({ message: 'Payout request not found' }, { status: 404 }));
    }

    let nextStatus = payout.status;
    const updateFields: any = {};

    if (action === 'approve') {
      if (payout.status !== 'REQUESTED') {
        return withCORS(NextResponse.json({ message: 'Only REQUESTED payouts can be approved' }, { status: 400 }));
      }
      nextStatus = 'APPROVED';
      updateFields.approvedBy = session.user.id;
      updateFields.approvedAt = new Date();

      await LedgerService.requestPayout({
        shopId: payout.shopId.toString(),
        amount: payout.amount,
        payoutId: payout._id.toString(),
        adminId: session.user.id,
      });

    } else if (action === 'complete') {
      if (!transactionId) {
        return withCORS(NextResponse.json({ message: 'Bank transaction ID is required' }, { status: 400 }));
      }
      if (!['APPROVED', 'PROCESSING'].includes(payout.status)) {
        return withCORS(NextResponse.json({ message: 'Only APPROVED or PROCESSING payouts can be completed' }, { status: 400 }));
      }
      nextStatus = 'COMPLETED';
      updateFields.transactionId = transactionId;
      updateFields.processedAt = new Date();

      await LedgerService.completePayout(payout._id.toString(), session.user.id, transactionId);

      await Order.updateMany(
        { _id: { $in: payout.orderIds }, 'vendorPayouts.shopId': payout.shopId },
        { $set: { 'vendorPayouts.$.status': 'released' } }
      );

    } else if (action === 'reject') {
      if (!failureReason) {
        return withCORS(NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 }));
      }
      if (payout.status === 'COMPLETED') {
        return withCORS(NextResponse.json({ message: 'Cannot reject a completed payout' }, { status: 400 }));
      }
      nextStatus = 'FAILED';
      updateFields.failureReason = failureReason;

      if (['APPROVED', 'PROCESSING'].includes(payout.status)) {
        await LedgerService.rejectPayout(
          payout._id.toString(),
          payout.shopId.toString(),
          payout.amount,
          failureReason,
          session.user.id
        );
      }

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

    // Send notification – no variable name conflict now
    const shopId = payout.shopId.toString();
    let title = '';
    let notificationBody = '';   // renamed to avoid conflict

    if (action === 'approve') {
      title = '💰 Payout Approved';
      notificationBody = `Your payout request of ₹${payout.amount.toFixed(2)} has been approved. Funds will be transferred shortly.`;
    } else if (action === 'complete') {
      title = '✅ Payout Completed';
      notificationBody = `Your payout of ₹${payout.amount.toFixed(2)} has been sent to your bank account. Transaction ID: ${transactionId}`;
    } else if (action === 'reject') {
      title = '❌ Payout Rejected';
      notificationBody = `Your payout request of ₹${payout.amount.toFixed(2)} was rejected. Reason: ${failureReason}`;
    }

    if (title) {
      await sendPushNotificationToVendor(shopId, title, notificationBody, { screen: 'wallet' });
    }

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

    return withCORS(NextResponse.json({
      success: true,
      message: `Payout ${nextStatus.toLowerCase()} successfully`,
      payout: updatedPayout,
    }));
  } catch (error: any) {
    console.error('Admin update payout error:', error);
    return withCORS(NextResponse.json(
      { message: 'Failed to update payout', error: error.message },
      { status: 500 }
    ));
  }
}