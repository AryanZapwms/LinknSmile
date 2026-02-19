// app/api/products/route.ts
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Company } from "@/lib/models/company";
import { Category } from "@/lib/models/category";
import Shop from "@/lib/models/shop"; // Import Shop to ensure it's registered for populate
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Simple in-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 2; // 2 minutes for API responses

function getCacheKey(params: any) {
  return JSON.stringify(params);
}

function getCachedResponse(key: string) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResponse(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    const category = searchParams.get("category");
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "12");
    const exclude = searchParams.get("exclude");

    // Create cache key from query parameters
    const cacheKey = getCacheKey({ company, category, page, limit, exclude });

    // Check cache first
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const query: any = { 
      isActive: true, 
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
        { approvalStatus: null }
      ]
    };

    // Optimize company and category lookups with parallel queries
    const [companyDoc, categoryDoc] = await Promise.all([
      company ? Company.findOne({ slug: company, isActive: true }).select('_id') : null,
      category ? Category.findOne({ slug: category, isActive: true }).select('_id parent') : null,
    ]);

    if (companyDoc) {
      query.company = companyDoc._id;
    }

    if (categoryDoc) {
      // If it's a main category (no parent), include itself and sub-categories
      if (!categoryDoc.parent) {
        const subCategories = await Category.find({
          parent: categoryDoc._id,
          isActive: true,
        }).select('_id');
        const categoryIds = [
          categoryDoc._id,
          ...subCategories.map((sub) => sub._id),
        ];
        query.category = { $in: categoryIds };
      } else {
        // It's a sub-category, just include itself
        query.category = categoryDoc._id;
      }
    }

    if (exclude) {
      query._id = { $ne: exclude };
    }

    const skip = (page - 1) * limit;

    // Execute count and products query in parallel for better performance
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("company", "name slug")
        .populate("category", "name slug")
        .populate("shopId", "shopName commissionRate")
        .select('name slug price discountPrice image images stock company category shopId createdAt')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(), // Use lean() for better performance
      Product.countDocuments(query)
    ]);

    const responseData = {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache the response
    setCachedResponse(cacheKey, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    //  SECURITY CHECK: Only admins can create products
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    
    console.log("🔍 Full request body keys:", Object.keys(body));
    console.log("🔍 Raw body.sizes:", body.sizes);
    
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
      isActive,
    } = body;

    // console.log(" POST /api/products - Received data:");
    // console.log("  Results:", results);
    // console.log("  SuitableFor:", suitableFor);
    // console.log("  Sizes:", sizes);
    // console.log(" After destructuring - sizes variable:", sizes);

    // console.log(" Creating product with sizes:", sizes);
    
    const product = new Product({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
      price,
      discountPrice,
      image: image || (images && images.length > 0 ? images[0] : undefined),
      images: images || (image ? [image] : []),
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
      isActive: isActive ?? true,
    });

    // console.log(" Immediately after new Product():");
    // console.log("  product.sizes:", product.sizes);
    // console.log("  product.sizes type:", typeof product.sizes);
    // console.log("  product.sizes is array:", Array.isArray(product.sizes));

    // console.log(" About to save product with:");
    // console.log("  Results:", product.results);
    // console.log("  SuitableFor:", product.suitableFor);
    // console.log("  Sizes before save:", product.sizes);

    await product.save();
    
    // console.log(" After save - Sizes in DB:", product.sizes);
    
    // console.log(" Product saved successfully with ID:", product._id);
    // console.log("  Saved Results:", product.results);
    // console.log("  Saved SuitableFor:", product.suitableFor);
    // console.log("  Saved Sizes:", product.sizes);
    // console.log("  Saved Sizes count:", product.sizes?.length);

    // Convert Mongoose document to plain object
    const productObject = product.toObject ? product.toObject() : product;
    // console.log(" Product object for response:", JSON.stringify(productObject, null, 2));
    // console.log(" Response sizes:", productObject.sizes);
    
    return NextResponse.json(productObject, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
