import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/order';

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

    // Convert shopId string to ObjectId for proper MongoDB query
    let shopObjectId: mongoose.Types.ObjectId;
    try {
      shopObjectId = new mongoose.Types.ObjectId(shopId);
    } catch {
      return NextResponse.json({ message: 'Invalid shop ID' }, { status: 400 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // pending, processing, shipped, delivered, cancelled
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query - find orders that contain vendor's products
    const query: any = {
      'items.shopId': shopObjectId,
    };

    if (status) {
      query.orderStatus = status;
    }

    const skip = (page - 1) * limit;

    // Get orders and filter items to show only vendor's items
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .populate('items.product', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    // Filter each order to show only vendor's items
    const vendorOrders = orders.map((order) => {
      // Filter items to only show vendor's products (using ObjectId equality)
      const vendorItems = order.items.filter(
        (item: any) => item.shopId && shopObjectId.equals(item.shopId)
      );

      // Calculate vendor's subtotal for this order
      const vendorSubtotal = vendorItems.reduce((sum: number, item: any) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Get vendor's payout info for this order
      const vendorPayout = order.vendorPayouts?.find(
        (p: any) => p.shopId && shopObjectId.equals(p.shopId)
      );

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        items: vendorItems, // Only vendor's items
        vendorSubtotal,
        vendorEarnings: vendorPayout?.amount || 0,
        payoutStatus: vendorPayout?.status || 'pending',
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      orders: vendorOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Vendor orders fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch orders', error: error.message },
      { status: 500 }
    );
  }
}