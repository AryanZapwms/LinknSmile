// app/api/vendor/orders/[id]/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/order';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'shop_owner') {
      return withCORS(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
    }

    await connectDB();

    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ message: 'Shop not found' }, { status: 404 }));
    }

    let shopObjectId: mongoose.Types.ObjectId;
    try {
      shopObjectId = new mongoose.Types.ObjectId(shopId);
    } catch {
      return withCORS(NextResponse.json({ message: 'Invalid shop ID' }, { status: 400 }));
    }

    const order = await Order.findById(id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name image price discountPrice')
      .lean();

    if (!order) {
      return withCORS(NextResponse.json({ message: 'Order not found' }, { status: 404 }));
    }

    // Check if this order contains vendor's products
    const hasVendorItems = order.items.some(
      (item: any) => item.shopId && shopObjectId.equals(item.shopId)
    );

    if (!hasVendorItems) {
      return withCORS(NextResponse.json({ message: 'Order not found' }, { status: 404 }));
    }

    // Filter to show only vendor's items
    const vendorItems = order.items.filter(
      (item: any) => item.shopId && shopObjectId.equals(item.shopId)
    );

    const vendorSubtotal = vendorItems.reduce((sum: number, item: any) => {
      const price = item.selectedSize?.price ?? item.price ?? 0;
      return sum + price * (item.quantity || 1);
    }, 0);

    const vendorPayout = order.vendorPayouts?.find(
      (p: any) => p.shopId && shopObjectId.equals(p.shopId)
    );

    const vendorEarnings = vendorItems.reduce(
      (sum: number, item: any) => sum + (item.vendorEarnings || 0),
      0
    );

    const vendorOrder = {
      _id: order._id,
      orderNumber: order.orderNumber,
      user: order.user,
      items: vendorItems,
      vendorSubtotal,
      vendorEarnings: vendorEarnings || vendorPayout?.amount || 0,
      platformCommission: vendorSubtotal - (vendorEarnings || vendorPayout?.amount || 0),
      payoutStatus: vendorPayout?.status || 'pending',
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      cancellationReason: (order as any).cancellationReason,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    return withCORS(NextResponse.json({
      success: true,
      order: vendorOrder,
    }));
  } catch (error: any) {
    console.error('Vendor order fetch error:', error);
    return withCORS(NextResponse.json(
      { message: 'Failed to fetch order', error: error.message },
      { status: 500 }
    ));
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'shop_owner') {
      return withCORS(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
    }

    await connectDB();
    const shopId = session.user.shopId;
    const body = await req.json();
    const { orderStatus, cancellationReason } = body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return withCORS(NextResponse.json({ message: 'Invalid status' }, { status: 400 }));
    }

    // Require reason when cancelling
    if (orderStatus === 'cancelled' && !cancellationReason?.trim()) {
      return withCORS(NextResponse.json(
        { message: 'Please provide a reason for cancellation' },
        { status: 400 }
      ));
    }

    let shopObjectId: mongoose.Types.ObjectId;
    try {
      shopObjectId = new mongoose.Types.ObjectId(shopId!);
    } catch {
      return withCORS(NextResponse.json({ message: 'Invalid shop ID' }, { status: 400 }));
    }

    const order = await Order.findById(id);
    if (!order) {
      return withCORS(NextResponse.json({ message: 'Order not found' }, { status: 404 }));
    }

    const hasVendorItems = order.items.some(
      (item: any) => item.shopId && shopObjectId.equals(item.shopId)
    );
    if (!hasVendorItems) {
      return withCORS(NextResponse.json({ message: 'Access denied' }, { status: 403 }));
    }

    // Prevent going backwards in status
    const statusOrder = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const currentIdx = statusOrder.indexOf(order.orderStatus);
    const newIdx = statusOrder.indexOf(orderStatus);
    if (orderStatus !== 'cancelled' && newIdx < currentIdx) {
      return withCORS(NextResponse.json(
        { message: `Cannot change status from "${order.orderStatus}" to "${orderStatus}"` },
        { status: 400 }
      ));
    }

    order.orderStatus = orderStatus;

    if (orderStatus === 'cancelled' && cancellationReason) {
      (order as any).cancellationReason = cancellationReason.trim();
    }

    // When delivered, mark vendor payout as pending-clearance (ready to release after 7 days)
    if (orderStatus === 'delivered') {
      const payoutIdx = order.vendorPayouts?.findIndex(
        (p: any) => p.shopId && shopObjectId.equals(p.shopId)
      );
      if (payoutIdx !== undefined && payoutIdx >= 0) {
        order.vendorPayouts[payoutIdx].status = 'pending'; // will be released by cron after 7 days
      }
    }

    await order.save();

    return withCORS(NextResponse.json({
      success: true,
      message: `Order status updated to ${orderStatus}`,
      order: {
        _id: order._id,
        orderStatus: order.orderStatus,
        cancellationReason: (order as any).cancellationReason,
      },
    }));
  } catch (error: any) {
    console.error('Vendor order status update error:', error);
    return withCORS(NextResponse.json(
      { message: 'Failed to update order status', error: error.message },
      { status: 500 }
    ));
  }
}