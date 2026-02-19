import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Shop from '@/lib/models/shop';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const shopId = session.user.shopId;

    if (!shopId) {
      return NextResponse.json({ 
        success: false,
        isApproved: false,
        message: 'Shop not found' 
      }, { status: 404 });
    }

    const shop = await Shop.findById(shopId).select('isApproved isActive');

    if (!shop) {
      return NextResponse.json({ 
        success: false,
        isApproved: false,
        message: 'Shop not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      isApproved: shop.isApproved,
      isActive: shop.isActive
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, isApproved: false, message: error.message },
      { status: 500 }
    );
  }
}
