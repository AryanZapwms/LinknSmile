import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Shop from '@/lib/models/shop';
import { sendEmail } from '@/lib/email';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { action, rejectionReason } = body; // action: 'approve', 'reject', 'activate', 'deactivate'

    const shop = await Shop.findById(id).populate('ownerId', 'name email');

    if (!shop) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    let message = '';

    switch (action) {
      case 'approve':
        shop.isApproved = true;
        shop.isActive = true;
        shop.approvalDate = new Date();
        shop.rejectionReason = undefined;
        message = 'Vendor approved successfully';

        // Send approval email
        try {
          await sendEmail({
            to: shop.contactInfo.email,
            subject: 'Your Shop Has Been Approved!',
            html: `
              <h1>Congratulations!</h1>
              <p>Your shop "${shop.shopName}" has been approved and is now live on LinkAndSmile.</p>
              <p>You can now start adding products and managing your store.</p>
              <p>Login to your vendor dashboard to get started.</p>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
        break;

      case 'reject':
        shop.isApproved = false;
        shop.isActive = false;
        shop.rejectionReason = rejectionReason || 'Not specified';
        message = 'Vendor rejected';

        // Send rejection email
        try {
          await sendEmail({
            to: shop.contactInfo.email,
            subject: 'Shop Application Update',
            html: `
              <h1>Shop Application Status</h1>
              <p>Unfortunately, your shop "${shop.shopName}" application has been rejected.</p>
              <p><strong>Reason:</strong> ${shop.rejectionReason}</p>
              <p>Please contact support if you have any questions.</p>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
        break;

      case 'activate':
        shop.isActive = true;
        message = 'Vendor activated';
        break;

      case 'deactivate':
        shop.isActive = false;
        message = 'Vendor deactivated';
        break;

      default:
        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    await shop.save();

    return NextResponse.json({
      success: true,
      message,
      shop,
    });
  } catch (error: any) {
    console.error('Vendor update error:', error);
    return NextResponse.json(
      { message: 'Failed to update vendor', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const shop = await Shop.findById(id)
      .populate('ownerId', 'name email phone createdAt')
      .lean();

    if (!shop) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      shop,
    });
  } catch (error: any) {
    console.error('Shop fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch shop', error: error.message },
      { status: 500 }
    );
  }
}