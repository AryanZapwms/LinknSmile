import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { HeroProduct } from "@/lib/models/hero-product";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const body = await request.json();
    const order: string[] = body.order;
    if (!Array.isArray(order) || order.length === 0) {
      return withCORS(NextResponse.json({ error: "order must be a non-empty array" }, { status: 400 }));
    }

    await Promise.all(
      order.map((id, index) => HeroProduct.updateOne({ _id: id }, { $set: { sortOrder: index } }))
    );

    return withCORS(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("Error reordering hero products:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to reorder hero products" }, { status: 500 })
    );
  }
}
