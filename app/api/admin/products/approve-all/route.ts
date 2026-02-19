import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/product';
import Shop from '@/lib/models/shop';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find all pending products
    const pendingProducts = await Product.find({ approvalStatus: 'pending' });

    if (pendingProducts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending products to approve',
        count: 0 
      });
    }

    const productIds = pendingProducts.map(p => p._id);
    const shopIds = Array.from(new Set(pendingProducts.map(p => p.shopId?.toString()).filter(Boolean)));

    // Update all pending products to approved
    await Product.updateMany(
      { _id: { $in: productIds } },
      {
        $set: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: session.user.id,
          isActive: true
        },
        $unset: { rejectionReason: "" }
      }
    );

    // Update shop stats for all involved shops
    // For each unique shop, increment stats.totalProducts by the number of products approved for that shop
    for (const shopId of shopIds) {
      const count = pendingProducts.filter(p => p.shopId?.toString() === shopId).length;
      await Shop.findByIdAndUpdate(shopId, {
        $inc: { 'stats.totalProducts': count },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${pendingProducts.length} products approved successfully`,
      count: pendingProducts.length
    });
  } catch (error: any) {
    console.error('Bulk approval error:', error);
    return NextResponse.json(
      { message: 'Failed to approve products', error: error.message },
      { status: 500 }
    );
  }
}
