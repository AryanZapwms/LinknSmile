import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Shop from '@/lib/models/shop';
import { User } from '@/lib/models/user';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // all, pending, approved, inactive
    const search = searchParams.get('search');

    const query: any = {};

    if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'approved') {
      query.isApproved = true;
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { shopName: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
      ];
    }

    const shops = await Shop.find(query)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      shops,
    });
  } catch (error: any) {
    console.error('Vendors fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch vendors', error: error.message },
      { status: 500 }
    );
  }
}