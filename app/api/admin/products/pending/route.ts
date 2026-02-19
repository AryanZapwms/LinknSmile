import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/product';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending'; // pending, approved, rejected

    const products = await Product.find({ approvalStatus: status })
      .populate('shopId', 'shopName')
      .populate('company', 'name slug')
      .populate('category', 'name')
      .sort({ submittedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error: any) {
    console.error('Pending products fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch products', error: error.message },
      { status: 500 }
    );
  }
}