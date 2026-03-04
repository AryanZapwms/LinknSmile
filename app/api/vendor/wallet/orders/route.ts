// app/api/vendor/wallet/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/order';
import Shop from '@/lib/models/shop';
import { Product } from '@/lib/models/product';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const shopId = session.user.shopId;
    if (!shopId) {
      return NextResponse.json({ error: 'Shop not found in session' }, { status: 404 });
    }

    const shop = await Shop.findById(shopId).select('commissionRate shopName');
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    // Fetch orders that contain items from this shop
    const [orders, total] = await Promise.all([
      Order.find({ 'items.shopId': shopId })
        .populate('items.product', 'name image slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ 'items.shopId': shopId }),
    ]);

    const orderBreakdowns = orders.map((order) => {
      // Only vendor's items from this order
      const vendorItems = order.items.filter(
        (item: any) => item.shopId?.toString() === shopId.toString()
      );

      const grossAmount = vendorItems.reduce((sum: number, item: any) => {
        const itemPrice = item.selectedSize?.price ?? item.price ?? 0;
        return sum + itemPrice * (item.quantity || 1);
      }, 0);

      const platformCommission = vendorItems.reduce(
        (sum: number, item: any) => sum + (item.platformCommission || 0),
        0
      );

      const vendorEarnings = vendorItems.reduce(
        (sum: number, item: any) => sum + (item.vendorEarnings || 0),
        0
      );

      // Settlement status from vendorPayouts
      const vendorPayout = order.vendorPayouts?.find(
        (p: any) => p.shopId?.toString() === shopId.toString()
      );
      const settlementStatus = vendorPayout?.status || 'pending';

      // Effective commission rate (use stored rate or compute)
      const commissionRate =
        vendorItems[0]?.commissionRate ?? shop.commissionRate ?? 10;

      return {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        items: vendorItems.map((item: any) => {
          const itemPrice = item.selectedSize?.price ?? item.price ?? 0;
          const itemTotal = itemPrice * (item.quantity || 1);
          const itemCommission = item.platformCommission || itemTotal * (commissionRate / 100);
          const itemEarnings = item.vendorEarnings || itemTotal - itemCommission;
          return {
            productId: item.product?._id?.toString() || item.product?.toString(),
            productName: item.product?.name || item.shopName || 'Product',
            productImage: item.product?.image,
            quantity: item.quantity || 1,
            unitPrice: itemPrice,
            totalPrice: itemTotal,
            platformCommission: parseFloat(itemCommission.toFixed(2)),
            vendorEarnings: parseFloat(itemEarnings.toFixed(2)),
            commissionRate,
            size: item.selectedSize?.size,
          };
        }),
        summary: {
          grossAmount: parseFloat(grossAmount.toFixed(2)),
          platformCommission: parseFloat(platformCommission.toFixed(2)),
          vendorEarnings: parseFloat(vendorEarnings.toFixed(2)),
          commissionRate,
          settlementStatus,
          // Human-readable settlement info
          settlementNote: (() => {
            if (order.paymentStatus !== 'completed') return 'Awaiting payment';
            if (order.orderStatus === 'cancelled') return 'Order cancelled';
            if (order.orderStatus !== 'delivered') return 'Settles after delivery';
            if (settlementStatus === 'released') return 'Credited to wallet';
            if (settlementStatus === 'held') return 'On hold - contact support';
            return 'Pending wallet credit (7 days after delivery)';
          })(),
        },
      };
    });

    return NextResponse.json({
      success: true,
      orders: orderBreakdowns,
      shopCommissionRate: shop.commissionRate,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[VendorWalletOrders GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
