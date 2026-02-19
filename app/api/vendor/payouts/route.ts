import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/order';
import Payout from '@/lib/models/payout';
import Shop from '@/lib/models/shop';
import mongoose from 'mongoose';
import { sendEmail, getPayoutRequestedEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const shopId = session.user.shopId;
    if (!shopId) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    // 1. Calculate stats and available balance
    const orders = await Order.find({
      'vendorPayouts.shopId': shopId,
      'orderStatus': 'delivered',
      'paymentStatus': 'completed'
    }).lean();

    let totalEarnings = 0;
    let pendingPayouts = 0; // Payouts currently in 'pending' or 'processing' status in Payout model
    let releasedPayouts = 0; // Payouts in 'completed' status in Payout model
    let availableBalance = 0; // Pending payouts in Order model that aren't linked to a Payout record yet

    orders.forEach((order: any) => {
      const vendorPayout = order.vendorPayouts?.find(
        (p: any) => p.shopId?.toString() === shopId
      );
      if (vendorPayout) {
        if (vendorPayout.status === 'pending') {
          availableBalance += vendorPayout.amount || 0;
        }
        totalEarnings += vendorPayout.amount || 0;
      }
    });

    // 2. Fetch payout history
    const payouts = await Payout.find({ shopId }).sort({ createdAt: -1 });

    // Calculate pending and released amounts from history
    payouts.forEach((p) => {
      if (p.status === 'pending' || p.status === 'processing') {
        pendingPayouts += p.amount;
      } else if (p.status === 'completed') {
        releasedPayouts += p.amount;
      }
    });

    return NextResponse.json({
      success: true,
      availableBalance: Math.round(availableBalance * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      pendingPayouts: Math.round(pendingPayouts * 100) / 100,
      releasedPayouts: Math.round(releasedPayouts * 100) / 100,
      payouts
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

    if (!amount || amount < 500) {
      return NextResponse.json({ message: 'Minimum payout amount is ₹500' }, { status: 400 });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    if (!shop.bankDetails || !shop.bankDetails.accountNumber) {
      return NextResponse.json({ 
        message: 'Please update your bank details in settings before requesting a payout' 
      }, { status: 400 });
    }

    // Calculate actual available balance
    const orders = await Order.find({
      'vendorPayouts.shopId': shopId,
      'vendorPayouts.status': 'pending',
      'orderStatus': 'delivered',
      'paymentStatus': 'completed'
    });

    let actualAvailable = 0;
    const orderIds: mongoose.Types.ObjectId[] = [];
    
    orders.forEach((order: any) => {
        const vendorPayout = order.vendorPayouts?.find(
            (p: any) => p.shopId?.toString() === shopId
        );
        if (vendorPayout && vendorPayout.status === 'pending') {
            actualAvailable += vendorPayout.amount || 0;
            orderIds.push(order._id);
        }
    });

    if (amount > actualAvailable) {
      return NextResponse.json({ 
        message: `Insufficient balance. Available: ₹${actualAvailable}` 
      }, { status: 400 });
    }

    // Create payout request
    const payoutId = new mongoose.Types.ObjectId();
    const payout = await Payout.create({
      _id: payoutId,
      shopId: new mongoose.Types.ObjectId(shopId),
      amount,
      orderIds,
      status: 'pending',
      notes,
      requestDate: new Date()
    });

    // Update orders to 'held' status
    await Order.updateMany(
      { _id: { $in: orderIds }, 'vendorPayouts.shopId': shopId },
      { $set: { 'vendorPayouts.$.status': 'held' } }
    );

    // Send email to admin
    try {
        await sendEmail({
            to: process.env.GMAIL_EMAIL!,
            subject: `New Payout Request: ₹${amount} from ${shop.shopName}`,
            html: getPayoutRequestedEmail({ 
                shopName: shop.shopName, 
                amount, 
                requestId: payoutId.toString() 
            })
        });
    } catch (emailError) {
        console.error('Failed to send payout request email to admin:', emailError);
    }

    console.log(`New Payout Request: ₹${amount} from ${shop.shopName}`);

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted successfully',
      payout
    });

  } catch (error: any) {
    console.error('Payout request error:', error);
    return NextResponse.json(
      { message: 'Failed to process payout request', error: error.message },
      { status: 500 }
    );
  }
}
