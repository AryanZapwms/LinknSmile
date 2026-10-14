// app/api/admin/vendors/[id]/posts/route.ts
//
// GET — every post of one shop, whatever its status, for the Posts tab of
// /admin/vendors/[id]. Acting on a post: ./[postId]/route.ts.
import mongoose from "mongoose";
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { apiError } from "@/lib/api-error";
import { listShopPosts } from "@/lib/shop-posts";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    if (!mongoose.isValidObjectId(id) || !(await Shop.exists({ _id: id }))) {
      return apiError("SHOP_NOT_FOUND", "Shop not found", 404, { message: "Shop not found" });
    }

    return withCORS(NextResponse.json({ success: true, posts: await listShopPosts(id) }));
  } catch (error) {
    console.error("List shop posts (admin) error:", error);
    return apiError("INTERNAL_ERROR", "Failed to load posts", 500, {
      message: "Failed to load posts",
    });
  }
}
