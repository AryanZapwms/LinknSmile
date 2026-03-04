import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Shop from '@/lib/models/shop';
import { sendEmail } from '@/lib/email';
import { Product } from '@/lib/models/product';
import { Order } from '@/lib/models/order';

export async function PATCH(
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
    const { action, rejectionReason, commissionRate, isApproved, isActive } = body;

    const shop = await Shop.findById(id).populate('ownerId', 'name email');

    if (!shop) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    let message = '';

    // ✅ Handle approve/reject/activate/deactivate
    if (action) {
      switch (action) {
        case 'approve':
          shop.isApproved = true;
          shop.isActive = true;
          shop.approvalDate = new Date();
          shop.rejectionReason = undefined;
          message = 'Vendor approved successfully';

          try {
            await sendEmail({
              to: shop.contactInfo.email,
              subject: 'Your Shop Has Been Approved!',
              html: `
                <h1>Congratulations!</h1>
                <p>Your shop "${shop.shopName}" has been approved and is now live.</p>
              `,
            });
          } catch (err) {
            console.error('Email error:', err);
          }
          break;

        case 'reject':
          shop.isApproved = false;
          shop.isActive = false;
          shop.rejectionReason = rejectionReason || 'Not specified';
          message = 'Vendor rejected';

          try {
            await sendEmail({
              to: shop.contactInfo.email,
              subject: 'Shop Application Update',
              html: `
                <h1>Shop Application Status</h1>
                <p>Your shop "${shop.shopName}" application has been rejected.</p>
                <p><strong>Reason:</strong> ${shop.rejectionReason}</p>
              `,
            });
          } catch (err) {
            console.error('Email error:', err);
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
    }

    // ✅ Handle commission update
    if (commissionRate !== undefined) {
      shop.commissionRate = commissionRate;
      message = 'Commission updated successfully';
    }

    // ✅ Handle direct isApproved / isActive flags from frontend
    if (isApproved !== undefined) shop.isApproved = isApproved;
    if (isActive !== undefined) shop.isActive = isActive;

    await shop.save();

    return NextResponse.json({
      success: true,
      message,
      shop,
    });
  } catch (error: any) {
    console.error('Vendor PATCH error:', error);
    return NextResponse.json(
      { message: 'Failed to update vendor', error: error.message },
      { status: 500 }
    );
  }
}

// Keep your GET as is
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const shop = await Shop.findById(id)
      .populate("ownerId", "name email phone createdAt")
      .lean();

    if (!shop) {
      return NextResponse.json({ message: "Shop not found" }, { status: 404 });
    }

    const products = await Product.find({ shopId: id }).populate("shopId", "shopName ownerId").lean();
    const orders = await Order.find({ vendorId: id }).lean();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    return NextResponse.json({
      success: true,
      shop: {
        ...shop,
        stats: {
          totalRevenue,
          totalOrders: orders.length,
        },
      },
      products,
      orders,
    });
  } catch (error: any) {
    console.error("Shop fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch shop", error: error.message },
      { status: 500 }
    );
  }
}