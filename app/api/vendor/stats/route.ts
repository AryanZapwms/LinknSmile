import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/product';
import { Order } from '@/lib/models/order';
import Shop from '@/lib/models/shop';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("SESSION:", session);

    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log(session);

    await connectDB();

    const shopId = session.user.shopId;
    console.log("Stats API - Session ShopId:", shopId);

    if (!shopId) {
      console.log("Stats API - Shop ID missing in session");
      return NextResponse.json({ 
        success: false,
        message: 'Shop not found in session. Please log out and log in again.' 
      }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
        console.log("Invalid shopId format:", shopId);
        return NextResponse.json({ 
          success: false,
          message: 'Invalid Shop ID format' 
        }, { status: 400 });
    }

    // Get shop details
    const shop = await Shop.findById(shopId);

    if (!shop) {
      console.log("Stats API - Shop document not found for ID:", shopId);
      return NextResponse.json({ 
        success: false,
        message: `Shop record not found in database for ID: ${shopId}` 
      }, { status: 404 });
    }

    // Count products by status
    const [totalProducts, pendingApproval, approvedProducts, rejectedProducts] = await Promise.all([
      Product.countDocuments({ shopId }),
      Product.countDocuments({ shopId, approvalStatus: 'pending' }),
      Product.countDocuments({ shopId, approvalStatus: 'approved' }),
      Product.countDocuments({ shopId, approvalStatus: 'rejected' }),
    ]);

    // Get orders containing vendor's products
    const orders = await Order.find({
      'items.shopId': shopId,
    }).lean();

    // Calculate earnings
    let totalOrders = 0;
    let totalEarnings = 0;
    let pendingPayouts = 0;

    orders.forEach((order) => {
      const vendorItems = order.items.filter(
        (item: any) => item.shopId?.toString() === shopId
      );

      if (vendorItems.length > 0) {
        totalOrders++;

        vendorItems.forEach((item: any) => {
          const earnings = item.vendorEarnings || 0;
          totalEarnings += earnings;

          // If order is delivered and payout is pending, add to pending payouts
          if (order.orderStatus === 'delivered' && order.paymentStatus === 'completed') {
            const vendorPayout = order.vendorPayouts?.find(
              (p: any) => p.shopId?.toString() === shopId
            );
            if (!vendorPayout || vendorPayout.status === 'pending') {
              pendingPayouts += earnings;
            }
          }
        });
      }
    });

    // Recent orders (last 5)
    const recentOrders = orders
      .filter((order) =>
        order.items.some((item: any) => item.shopId?.toString() === shopId)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((order) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.orderStatus,
        createdAt: order.createdAt,
      }));

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        pendingApproval,
        approvedProducts,
        rejectedProducts,
        totalOrders,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        pendingPayouts: Math.round(pendingPayouts * 100) / 100,
      },
      shop: {
        name: shop.shopName,
        isApproved: shop.isApproved,
        isActive: shop.isActive,
        commissionRate: shop.commissionRate,
        ratings: shop.ratings,
      },
      recentOrders,
    });
  } catch (error: any) {
    console.error('Vendor stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats', error: error.message },
      { status: 500 }
    );
  }
}