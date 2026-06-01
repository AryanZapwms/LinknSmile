import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/product';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'shop_owner') {
      return withCORS(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
    }

    await connectDB();

    const product = await Product.findById(id)
      .populate('category', 'name')
      .populate('company', 'name')
      .lean();

    if (!product) {
      return withCORS(NextResponse.json({ message: 'Product not found' }, { status: 404 }));
    }

    let shopId = session.user.shopId;
    if (!shopId) {
      const Shop = (await import("@/lib/models/shop")).default;
      const shop = await Shop.findOne({ ownerId: session.user.id });
      if (shop) shopId = shop._id.toString();
    }

    if (product.shopId?.toString() !== shopId) {
      return withCORS(NextResponse.json({ message: 'Unauthorized - Not your product' }, { status: 403 }));
    }

    return withCORS(NextResponse.json({ success: true, product }));
  } catch (error: any) {
    console.error('Product fetch error:', error);
    return withCORS(NextResponse.json(
      { message: 'Failed to fetch product', error: error.message },
      { status: 500 }
    ));
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'shop_owner') {
      return withCORS(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
    }

    await connectDB();

    const product = await Product.findById(id);

    if (!product) {
      return withCORS(NextResponse.json({ message: 'Product not found' }, { status: 404 }));
    }

    let shopId = session.user.shopId;
    if (!shopId) {
      const Shop = (await import("@/lib/models/shop")).default;
      const shop = await Shop.findOne({ ownerId: session.user.id });
      if (shop) shopId = shop._id.toString();
    }

    if (product.shopId?.toString() !== shopId) {
      return withCORS(NextResponse.json({ message: 'Unauthorized - Not your product' }, { status: 403 }));
    }

    const body = await req.json();

    // FIX: Sanitize ObjectId fields — never let an empty string or 'none'
    // reach Mongoose, it will throw a CastError and the update silently fails.
    const sanitized: Record<string, any> = { ...body };

    if (!sanitized.category || sanitized.category === 'none') {
      // Use $unset to clear the field rather than setting it to ""
      delete sanitized.category;
    }
    if (!sanitized.company || sanitized.company === 'none') {
      delete sanitized.company;
    }

    // If product is currently approved and vendor is making changes,
    // reset approval so admin has to re-approve with new details
    if (product.approvalStatus === 'approved') {
      sanitized.approvalStatus = 'pending';
      sanitized.submittedAt = new Date();
      sanitized.isActive = false;
    }

    // FIX: use $set so we only update provided fields and don't accidentally
    // wipe fields that weren't included in the payload
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: sanitized },
      { new: true, runValidators: true }
    );

    return withCORS(NextResponse.json({
      success: true,
      message: product.approvalStatus === 'approved'
        ? 'Product updated and resubmitted for approval'
        : 'Product updated successfully',
      product: updatedProduct,
    }));
  } catch (error: any) {
    console.error('Product update error:', error);
    return withCORS(NextResponse.json(
      { message: 'Failed to update product', error: error.message },
      { status: 500 }
    ));
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'shop_owner') {
      return withCORS(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
    }

    await connectDB();

    const product = await Product.findById(id);

    if (!product) {
      return withCORS(NextResponse.json({ message: 'Product not found' }, { status: 404 }));
    }

    let shopId = session.user.shopId;
    if (!shopId) {
      const Shop = (await import("@/lib/models/shop")).default;
      const shop = await Shop.findOne({ ownerId: session.user.id });
      if (shop) shopId = shop._id.toString();
    }

    if (product.shopId?.toString() !== shopId) {
      return withCORS(NextResponse.json({ message: 'Unauthorized - Not your product' }, { status: 403 }));
    }

    await Product.findByIdAndDelete(id);

    return withCORS(NextResponse.json({ success: true, message: 'Product deleted successfully' }));
  } catch (error: any) {
    console.error('Product delete error:', error);
    return withCORS(NextResponse.json(
      { message: 'Failed to delete product', error: error.message },
      { status: 500 }
    ));
  }
}