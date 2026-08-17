import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models/review";
import { Product } from "@/lib/models/product";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

// GET: fetch all reviews for the vendor's products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ error: "Shop not found in session" }, { status: 404 }));
    }

    await connectDB();

    const products = await Product.find({ shopId }).select("_id").lean();
    const productIds = products.map((p: any) => p._id);

    const reviews = await Review.find({ product: { $in: productIds }, isDeleted: false })
      .populate("user", "name avatar")
      .populate("product", "name image")
      .sort({ createdAt: -1 })
      .lean() as any;

    return withCORS(NextResponse.json({ success: true, reviews }));
  } catch (error) {
    console.error("Error fetching vendor reviews:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 }));
  }
}
