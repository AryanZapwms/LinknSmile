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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const shopId = session.user.shopId;

    if (!shopId) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    // Convert shopId string to ObjectId for proper comparison
    let shopObjectId: mongoose.Types.ObjectId;
    try {
      shopObjectId = new mongoose.Types.ObjectId(shopId);
    } catch {
      return NextResponse.json({ message: 'Invalid shop ID' }, { status: 400 });
    }

    const order = await Order.findById(id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name image price discountPrice')
      .lean();

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Check if this order contains vendor's products (using ObjectId equality)
    const hasVendorItems = order.items.some(
      (item: any) => item.shopId && shopObjectId.equals(item.shopId)
    );

    if (!hasVendorItems) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Filter to show only vendor's items
    const vendorItems = order.items.filter(
      (item: any) => item.shopId && shopObjectId.equals(item.shopId)
    );

    // Calculate vendor's totals
    const vendorSubtotal = vendorItems.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const vendorPayout = order.vendorPayouts?.find(
      (p: any) => p.shopId && shopObjectId.equals(p.shopId)
    );

    const vendorOrder = {
      _id: order._id,
      orderNumber: order.orderNumber,
      user: order.user,
      items: vendorItems,
      vendorSubtotal,
      vendorEarnings: vendorPayout?.amount || 0,
      platformCommission: vendorSubtotal - (vendorPayout?.amount || 0),
      payoutStatus: vendorPayout?.status || 'pending',
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    return NextResponse.json({
      success: true,
      order: vendorOrder,
    });
  } catch (error: any) {
    console.error('Vendor order fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch order', error: error.message },
      { status: 500 }
    );
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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const shopId = session.user.shopId;
    const body = await req.json();
    const { orderStatus } = body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    let shopObjectId: mongoose.Types.ObjectId;
    try {
      shopObjectId = new mongoose.Types.ObjectId(shopId!);
    } catch {
      return NextResponse.json({ message: 'Invalid shop ID' }, { status: 400 });
    }

    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Check if this order contains vendor's products (using ObjectId equality)
    const hasVendorItems = order.items.some(
      (item: any) => item.shopId && shopObjectId.equals(item.shopId)
    );

    if (!hasVendorItems) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    order.orderStatus = orderStatus;
    await order.save();

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${orderStatus}`,
    });
  } catch (error: any) {
    console.error('Vendor order status update error:', error);
    return NextResponse.json(
      { message: 'Failed to update order status', error: error.message },
      { status: 500 }
    );
  }
}
