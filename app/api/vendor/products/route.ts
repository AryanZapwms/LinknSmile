// app/api/vendor/products/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Company } from "@/lib/models/company";
import { Category } from "@/lib/models/category";

const VALID_ORIGINS = ["made-in-india", "foreign-made", "unspecified"] as const;

async function getShopIdForUser(userId: string, sessionShopId?: string) {
  await connectDB();
  const Shop = (await import("@/lib/models/shop")).default;
  if (sessionShopId) return sessionShopId;
  const shop = await Shop.findOne({ ownerId: userId });
  return shop?._id.toString();
}

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);
    if (!shopId) {
      return withCORS(NextResponse.json(
        { message: "Shop ID not found. Please complete vendor setup." },
        { status: 404 }
      ));
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: any = { shopId };
    if (status) query.approvalStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const _category = Category;
    const _company = Company;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category", "name")
        .populate("company", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return withCORS(NextResponse.json({
      success: true,
      products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }));
  } catch (error: any) {
    console.error("Vendor products fetch error:", error);
    return withCORS(NextResponse.json(
      { message: "Failed to fetch products", error: error.message },
      { status: 500 }
    ));
  }
}

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }
    if (session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized - not a shop owner" }, { status: 401 }));
    }

    await connectDB();
    const Shop = (await import("@/lib/models/shop")).default;
    const shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);
    if (!shopId) {
      return withCORS(NextResponse.json(
        { message: "Shop ID not found. Please complete vendor setup." },
        { status: 401 }
      ));
    }

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isApproved) {
      return withCORS(NextResponse.json({
        message: "Your shop is pending approval. You can only add products after your shop is approved.",
      }, { status: 403 }));
    }

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
      origin,       // ← now properly destructured
      ingredients,
      benefits,
      usage,
      suitableFor,
      results,
      sizes,
    } = body;

    if (!name || !slug || !price) {
      return withCORS(NextResponse.json(
        { message: "Name, slug, and price are required" },
        { status: 400 }
      ));
    }

    const existingProduct = await Product.findOne({ slug });
    if (existingProduct) {
      return withCORS(NextResponse.json(
        { message: "A product with this slug already exists" },
        { status: 400 }
      ));
    }

    const product = await Product.create({
      name,
      slug: slug.toLowerCase(),
      description,
      price,
      discountPrice,
      image,
      images: images || [],
      category: category || undefined,
      company: company || undefined,
      shopId,
      stock: stock || 0,
      sku,
      origin: VALID_ORIGINS.includes(origin) ? origin : "unspecified",  // ← saved
      ingredients: ingredients || [],
      benefits: benefits || [],
      usage,
      suitableFor: suitableFor || [],
      results: results || [],
      sizes: sizes || [],
      approvalStatus: "pending",
      submittedAt: new Date(),
      isActive: false,
    });

    return withCORS(NextResponse.json({
      success: true,
      message: "Product created and submitted for approval",
      product,
    }));
  } catch (error: any) {
    console.error("Product creation error:", error);
    return withCORS(NextResponse.json(
      { message: "Failed to create product", error: error.message },
      { status: 500 }
    ));
  }
}