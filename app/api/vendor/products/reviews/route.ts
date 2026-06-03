import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models/review";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

// GET: fetch all reviews for the vendor's products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const reviews = await Review.find({ isDeleted: false })
      .populate("user", "name avatar")
      .populate("product", "name image")
      .sort({ createdAt: -1 })
      .lean();

    return withCORS(NextResponse.json({ success: true, reviews }));
  } catch (error) {
    console.error("Error fetching vendor reviews:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 }));
  }
}
