// app/api/products/route.ts
import { withCORS } from "@/lib/cors";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Category } from "@/lib/models/category";
import Shop from "@/lib/models/shop";
import { HeroProduct } from "@/lib/models/hero-product";
import { getAuthUser } from "@/lib/get-auth-user";
import { type NextRequest, NextResponse } from "next/server";

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 2;

function getCacheKey(params: any) {
  return JSON.stringify(params);
}

function getCachedResponse(key: string) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  return null;
}

// Search terms make the key space unbounded, so keep only the newest entries.
const CACHE_MAX_ENTRIES = 500;

function setCachedResponse(key: string, data: any) {
  apiCache.delete(key);
  apiCache.set(key, { data, timestamp: Date.now() });
  while (apiCache.size > CACHE_MAX_ENTRIES) {
    apiCache.delete(apiCache.keys().next().value as string);
  }
}

const VALID_ORIGINS = ["made-in-india", "foreign-made", "unspecified"] as const;

// Page-size ceiling. The public web pages ask for up to 100 (home,
// /products); admins' catalogue pages ask for up to 1000 and are the only
// callers allowed that much. Mobile should page with 20–50.
const MAX_LIMIT = 100;
const MAX_ADMIN_LIMIT = 1000;
const MAX_SEARCH_LENGTH = 100;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const origin = searchParams.get("origin");
    const exclude = searchParams.get("exclude");
    const shopId = searchParams.get("shopId");
    const ids = searchParams.get("ids");
    const search = (searchParams.get("search") ?? searchParams.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
    const featured = searchParams.get("featured") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const requestedLimit = Math.max(1, parseInt(searchParams.get("limit") || "12") || 12);
    let limit = Math.min(requestedLimit, MAX_LIMIT);
    if (requestedLimit > MAX_LIMIT && (await getAuthUser(request))?.role === "admin") {
      limit = Math.min(requestedLimit, MAX_ADMIN_LIMIT);
    }

    const cacheKey = getCacheKey({ category, origin, page, limit, exclude, shopId, ids, search, featured });
    const cached = getCachedResponse(cacheKey);
    if (cached) return withCORS(NextResponse.json(cached));

    const query: any = {
      isActive: true,
      hiddenBySubscription: { $ne: true },
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
        { approvalStatus: null },
      ],
    };
    // Extra conditions that may each constrain _id or need their own $or.
    const and: any[] = [];

    // ── Search (name, case-insensitive substring) ────────────
    if (search) {
      and.push({ name: { $regex: escapeRegex(search), $options: "i" } });
    }

    // ── Featured = the admin's hero products, in hero order ──
    let featuredOrder: string[] | null = null;
    if (featured) {
      const heroes = await HeroProduct.find({ isActive: true })
        .sort({ sortOrder: 1, createdAt: 1 })
        .select("productId")
        .lean<{ productId: mongoose.Types.ObjectId }[]>();
      featuredOrder = heroes.map((h) => String(h.productId));
      and.push({ _id: { $in: heroes.map((h) => h.productId) } });
    }

    // ── Category filter ──────────────────────────────────────
    if (category) {
      // Support both ObjectId and slug
      let categoryDoc = null;
      if (mongoose.Types.ObjectId.isValid(category)) {
        categoryDoc = await Category.findOne({ _id: category, isActive: true }).select(
          "_id parent"
        );
      } else {
        categoryDoc = await Category.findOne({ slug: category, isActive: true }).select(
          "_id parent"
        );
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

    // ── Ids filter (for favourites page) ────────────────────
    if (ids) {
      const idList = ids
        .split(",")
        .filter((i) => mongoose.Types.ObjectId.isValid(i))
        .map((i) => new mongoose.Types.ObjectId(i));

      if (idList.length === 0) {
        return withCORS(
          NextResponse.json({
            products: [],
            pagination: { total: 0, page: 1, limit: 0, pages: 0 },
          })
        );
      }

      and.push({ _id: { $in: idList } });
    }

    // ── Exclude a specific product ───────────────────────────
    if (exclude && mongoose.Types.ObjectId.isValid(exclude)) {
      and.push({ _id: { $ne: new mongoose.Types.ObjectId(exclude) } });
    }

    if (and.length) query.$and = and;

    const skip = (page - 1) * limit;
    const fields = "name slug price discountPrice image images stock category shopId origin createdAt";

    let products: any[];
    let total: number;
    if (featuredOrder) {
      // The hero list is small and admin-curated: order it in memory.
      const rank = new Map(featuredOrder.map((id, i) => [id, i]));
      const all = await Product.find(query)
        .populate("category", "name slug")
        .populate("shopId", "shopName commissionRate")
        .select(fields)
        .lean();
      all.sort((a: any, b: any) => (rank.get(String(a._id)) ?? 0) - (rank.get(String(b._id)) ?? 0));
      total = all.length;
      products = all.slice(skip, skip + limit);
    } else {
      [products, total] = await Promise.all([
        Product.find(query)
          .populate("category", "name slug")
          .populate("shopId", "shopName commissionRate")
          .select(fields)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Product.countDocuments(query),
      ]);
    }

    const responseData = {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: skip + products.length < total,
      },
    };

    setCachedResponse(cacheKey, responseData);
    return withCORS(NextResponse.json(responseData));
  } catch (error) {
    console.error("Products API error:", error);
    return withCORS(
      NextResponse.json(
        {
          error: "Failed to fetch products",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
