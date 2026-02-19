import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/product';
import Shop from '@/lib/models/shop';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { productId, action, rejectionReason } = body; // action: 'approve' or 'reject'

    const product = await Product.findById(productId).populate('shopId', 'shopName contactInfo');

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    let message = '';

    if (action === 'approve') {
      product.approvalStatus = 'approved';
      product.approvedAt = new Date();
      product.approvedBy = session.user.id;
      product.isActive = true;
      product.rejectionReason = undefined;
      message = 'Product approved successfully';

      // Update shop stats
      if (product.shopId) {
        await Shop.findByIdAndUpdate(product.shopId, {
          $inc: { 'stats.totalProducts': 1 },
        });
      }

      // Send approval email to vendor
      if (product.shopId && product.shopId.contactInfo) {
        try {
          await sendEmail({
            to: product.shopId.contactInfo.email,
            subject: 'Product Approved!',
            html: `
              <h1>Product Approved</h1>
              <p>Your product "${product.name}" has been approved and is now live on LinkAndSmile.</p>
              <p>Customers can now view and purchase this product.</p>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }
    } else if (action === 'reject') {
      product.approvalStatus = 'rejected';
      product.rejectionReason = rejectionReason || 'Not specified';
      product.isActive = false;
      message = 'Product rejected';

      // Send rejection email to vendor
      if (product.shopId && product.shopId.contactInfo) {
        try {
          await sendEmail({
            to: product.shopId.contactInfo.email,
            subject: 'Product Review Update',
            html: `
              <h1>Product Review Status</h1>
              <p>Your product "${product.name}" was not approved.</p>
              <p><strong>Reason:</strong> ${product.rejectionReason}</p>
              <p>You can edit and resubmit the product from your vendor dashboard.</p>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
      }
    } else {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    await product.save();

    return NextResponse.json({
      success: true,
      message,
      product,
    });
  } catch (error: any) {
    console.error('Product approval error:', error);
    return NextResponse.json(
      { message: 'Failed to process product', error: error.message },
      { status: 500 }
    );
  }
}