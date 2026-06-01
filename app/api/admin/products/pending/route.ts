// app/api/admin/products/pending/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";

export async function GET(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return withCORS(new NextResponse(null));
  }

  try {
    // 🔐 Check Admin Session
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      ));
    }

    // 🗄 Connect DB
    await connectDB();

    // 🔥 IMPORTANT: Force model registration in this route context
    await import("@/lib/models/company");
    await import("@/lib/models/shop");
    await import("@/lib/models/category");

    // 📌 Get status from query
    const { searchParams } = new URL(req.url);
    const status =
      searchParams.get("status") || "pending"; // pending | approved | rejected

    // 📦 Fetch Products
    const products = await Product.find({
      approvalStatus: status,
    })
      .populate("shopId", "shopName")
      .populate("company", "name slug")
      .populate("category", "name")
      .sort({ submittedAt: -1 })
      .lean();

    return withCORS(NextResponse.json({
      success: true,
      count: products.length,
      products,
    }));
  } catch (error: any) {
    console.error("Pending products fetch error:", error);

    return withCORS(NextResponse.json(
      {
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      },
      { status: 500 }
    ));
  }
}