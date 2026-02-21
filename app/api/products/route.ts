// app/api/products/route.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";

import { Category } from "@/lib/models/category";
import Shop from "@/lib/models/shop"; // ensure Shop is registered
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// In-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 2;

function getCacheKey(params: any) {
  return JSON.stringify(params);
}

function getCachedResponse(key: string) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("✅ Returning cached response");
    return cached.data;
  }
  return null;
}

function setCachedResponse(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔹 API HIT: /api/products");

    await connectDB();
    console.log("✅ DB Connected");

    const { searchParams } = new URL(request.url);


    const category = searchParams.get("category");
    const exclude = searchParams.get("exclude");

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1") || 1
    );

    const limit = Math.max(
      1,
      parseInt(searchParams.get("limit") || "12") || 12
    );

    console.log("📌 Params:", { category, page, limit, exclude });

    const cacheKey = getCacheKey({ category, page, limit, exclude });

    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const query: any = {
      isActive: true,
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
        { approvalStatus: null },
      ],
    };

    console.log("🔍 Base Query:", query);

    // Fetch category in parallel
    const [categoryDoc] = await Promise.all([
      category
        ? Category.findOne({ slug: category, isActive: true }).select(
            "_id parent"
          )
        : null,
    ]);

    if (categoryDoc) {
      if (!categoryDoc.parent) {
        const subCategories = await Category.find({
          parent: categoryDoc._id,
          isActive: true,
        }).select("_id");

        const categoryIds = [
          categoryDoc._id,
          ...subCategories.map((sub) => sub._id),
        ];

        query.category = { $in: categoryIds };
      } else {
        query.category = categoryDoc._id;
      }
    }

    if (exclude && mongoose.Types.ObjectId.isValid(exclude)) {
      query._id = { $ne: exclude };
    }

    console.log("🧠 Final Query:", JSON.stringify(query));

    const skip = (page - 1) * limit;

    console.log("⏭ Skip:", skip);

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .populate("shopId", "shopName commissionRate")
        .select(
          "name slug price discountPrice image images stock category shopId createdAt"
        )
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(query),
    ]);

    console.log("📦 Products Found:", products.length);
    console.log("🔢 Total Count:", total);

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

    console.log("✅ API SUCCESS");

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ FULL PRODUCTS ERROR:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}