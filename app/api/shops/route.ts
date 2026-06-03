// app/api/shops/route.ts
import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const skip = (page - 1) * limit;

    // Only return approved + active shops
    const query = { isApproved: true, isActive: true };

    // ── Ids filter (for favourites page) ────────────────────
    const ids = searchParams.get("ids");
    if (ids) {
      const mongoose = (await import("mongoose")).default;
      const idList = ids
        .split(",")
        .filter((i) => mongoose.Types.ObjectId.isValid(i))
        .map((i) => new mongoose.Types.ObjectId(i));

      if (idList.length === 0) {
        return withCORS(
          NextResponse.json({
            shops: [],
            pagination: { total: 0, page: 1, limit: 0, pages: 0 },
          })
        );
      }

      query._id = { $in: idList };
    }

    const [shops, total] = await Promise.all([
      Shop.find(query)
        .select("shopName slug logo description address ratings stats")
        .sort({ "stats.totalOrders": -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Shop.countDocuments(query),
    ]);

    return withCORS(
      NextResponse.json({
        shops,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    console.error("Shops fetch error:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch shops" }, { status: 500 }));
  }
}
