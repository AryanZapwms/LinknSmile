import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { HeroProduct } from "@/lib/models/hero-product";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const heroProducts = await HeroProduct.find()
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate("productId", "name image price discountPrice slug");

    return withCORS(NextResponse.json(heroProducts));
  } catch (error) {
    console.error("Error fetching hero products:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch hero products" }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const { productId } = await request.json();
    if (!productId) {
      return withCORS(NextResponse.json({ error: "productId is required" }, { status: 400 }));
    }

    const existing = await HeroProduct.findOne({ productId });
    if (existing) {
      return withCORS(
        NextResponse.json({ error: "Product is already featured" }, { status: 409 })
      );
    }

    const lastEntry = await HeroProduct.findOne().sort({ sortOrder: -1 });
    const nextSortOrder = (lastEntry?.sortOrder ?? -1) + 1;

    const heroProduct = await HeroProduct.create({
      productId,
      sortOrder: nextSortOrder,
    });

    return withCORS(NextResponse.json(heroProduct, { status: 201 }));
  } catch (error) {
    console.error("Error adding hero product:", error);
    return withCORS(NextResponse.json({ error: "Failed to add hero product" }, { status: 500 }));
  }
}
