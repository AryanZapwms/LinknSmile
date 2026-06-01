import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Order } from '@/lib/models/order';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const shopId = session.user.shopId;

  const stats = await Order.aggregate([
    { $unwind: '$items' },
    { $match: { 'items.shopId': new mongoose.Types.ObjectId(shopId) } },
    { $group: {
        _id: '$items.product',
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.vendorEarnings' },
      }
    },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $project: { productName: '$product.name', productImage: '$product.images.0', totalOrders: 1, totalQuantity: 1, totalRevenue: 1 } }
  ]);

  return NextResponse.json(stats);
}