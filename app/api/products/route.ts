// app/api/products/route.ts
import { withCORS } from "@/lib/cors";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Category } from "@/lib/models/category";
import Shop from "@/lib/models/shop";
import { type NextRequest, NextResponse } from "next/server";

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 2;

function getCacheKey(params: any) { return JSON.stringify(params); }

function getCachedResponse(key: string) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  return null;
}

function setCachedResponse(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

const VALID_ORIGINS = ["made-in-india", "foreign-made", "unspecified"] as const;

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const origin   = searchParams.get("origin");
    const exclude  = searchParams.get("exclude");
    const shopId   = searchParams.get("shopId");
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1")  || 1);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "12") || 12);

    const cacheKey = getCacheKey({ category, origin, page, limit, exclude, shopId });
    const cached = getCachedResponse(cacheKey);
    if (cached) return withCORS(NextResponse.json(cached));

    const query: any = {
      isActive: true,
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
        { approvalStatus: null },
      ],
    };

    // ── Category filter ──────────────────────────────────────
    if (category) {
      // Support both ObjectId and slug
      let categoryDoc = null;
      if (mongoose.Types.ObjectId.isValid(category)) {
        categoryDoc = await Category.findOne({ _id: category, isActive: true }).select("_id parent");
      } else {
        categoryDoc = await Category.findOne({ slug: category, isActive: true }).select("_id parent");
      }

      if (categoryDoc) {
        if (!categoryDoc.parent) {
          // It's a parent — include all its children too
          const subCategories = await Category.find({
            parent: categoryDoc._id,
            isActive: true,
          }).select("_id");
          query.category = {
            $in: [categoryDoc._id, ...subCategories.map((s) => s._id)],
          };
        } else {
          query.category = categoryDoc._id;
        }
      }
    }

    // ── Origin filter ────────────────────────────────────────
    if (origin && VALID_ORIGINS.includes(origin as any)) {
      query.origin = origin;
    }

    // ── Shop filter ──────────────────────────────────────────
    if (shopId && mongoose.Types.ObjectId.isValid(shopId)) {
      query.shopId = shopId;
    }

    // ── Exclude a specific product ───────────────────────────
    if (exclude && mongoose.Types.ObjectId.isValid(exclude)) {
      query._id = { $ne: exclude };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .populate("shopId", "shopName commissionRate")
        .select("name slug price discountPrice image images stock category shopId origin createdAt")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(query),
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

    setCachedResponse(cacheKey, responseData);
    return withCORS(NextResponse.json(responseData));
  } catch (error) {
    console.error("Products API error:", error);
    return withCORS(
      NextResponse.json(
        { error: "Failed to fetch products", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    );
  }
}