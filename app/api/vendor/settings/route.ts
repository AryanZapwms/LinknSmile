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
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    const shop = await Shop.findById(shopId).select('-businessProof');
    if (!shop) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      shop
    });
  } catch (error: any) {
    console.error('Fetch vendor settings error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch settings', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const shopId = session.user.shopId;
    const body = await req.json();

    const allowedUpdates = [
      'shopName', 'description', 'logo', 'coverImage',
      'address', 'contactInfo', 'bankDetails'
    ];

    const updates: any = {};
    allowedUpdates.forEach(key => {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    });

    // Simple validation for bank details if provided
    if (updates.bankDetails) {
      const { accountNumber, ifscCode, accountHolderName, bankName } = updates.bankDetails;
      
      if (accountNumber && (accountNumber.length < 9 || accountNumber.length > 18)) {
        return NextResponse.json({ message: 'Invalid bank account number length' }, { status: 400 });
      }

      if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
        return NextResponse.json({ message: 'Invalid IFSC code format (e.g. SBIN0012345)' }, { status: 400 });
      }

      if (!accountHolderName || !bankName) {
         return NextResponse.json({ message: 'Account holder name and bank name are required' }, { status: 400 });
      }
    }

    const shop = await Shop.findByIdAndUpdate(
      shopId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      shop
    });

  } catch (error: any) {
    console.error('Update vendor settings error:', error);
    return NextResponse.json(
      { message: 'Failed to update settings', error: error.message },
      { status: 500 }
    );
  }
}
