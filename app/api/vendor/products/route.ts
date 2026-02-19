import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/product';

async function getShopIdForUser(userId: string, sessionShopId?: string) {
  await connectDB();
  const Shop = (await import('@/lib/models/shop')).default;
  if (sessionShopId) return sessionShopId;

  const shop = await Shop.findOne({ ownerId: userId });
  return shop?._id.toString();
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get Shop model once
    const Shop = (await import('@/lib/models/shop')).default;

    // Get shopId (from session or DB fallback)
   let shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);


    if (!shopId) {
      return NextResponse.json(
        { message: 'Shop ID not found. Please ensure you have completed vendor setup.' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // pending, approved, rejected
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    const query: any = { shopId };
    if (status) query.approvalStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .populate('company', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Vendor products fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch products', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized - No session' }, { status: 401 });
    }

    if (session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized - Role is not shop_owner' }, { status: 401 });
    }

    await connectDB();

    // Import Shop model once
    const Shop = (await import('@/lib/models/shop')).default;

    // Get shopId (from session or DB fallback)
let shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);


    if (!shopId) {
      return NextResponse.json({ message: 'Shop ID not found. Please ensure you have completed vendor setup.' }, { status: 401 });
    }

    // Validate shop exists and is approved
    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isApproved) {
      return NextResponse.json({
        message: 'Your shop is pending approval. You can only add products after your shop is approved by an administrator.',
      }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const {
      name,
      slug,
      description,
      price,
      discountPrice,
      image,
      images,
      category,
      company,
      stock,
      sku,
      ingredients,
      benefits,
      usage,
      suitableFor,
      results,
      sizes,
    } = body;

    // Validate required fields
    if (!name || !slug || !price || !company) {
      return NextResponse.json(
        { message: 'Name, slug, price, and company are required' },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existingProduct = await Product.findOne({ slug });
    if (existingProduct) {
      return NextResponse.json(
        { message: 'Product with this slug already exists' },
        { status: 400 }
      );
    }

    // Create new product
    const product = await Product.create({
      name,
      slug: slug.toLowerCase(),
      description,
      price,
      discountPrice,
      image,
      images: images || [],
      category: category || undefined,
      company,
      shopId,
      stock: stock || 0,
      sku,
      ingredients: ingredients || [],
      benefits: benefits || [],
      usage,
      suitableFor: suitableFor || [],
      results: results || [],
      sizes: sizes || [],
      approvalStatus: 'pending',
      submittedAt: new Date(),
      isActive: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Product created and submitted for approval',
      product,
    });
  } catch (error: any) {
    console.error('Product creation error details:', {
      message: error.message,
      stack: error.stack,
      errors: error.errors,
    });
    return NextResponse.json(
      { message: 'Failed to create product', error: error.message },
      { status: 500 }
    );
  }
}
