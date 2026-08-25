import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { HeroProduct } from "@/lib/models/hero-product";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    await connectDB();

    const heroProducts = await HeroProduct.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate("productId", "name image price discountPrice slug");

    const products = heroProducts
      .filter((hp: any) => hp.productId)
      .map((hp: any) => ({
        _id: hp.productId._id.toString(),
        name: hp.productId.name,
        image: hp.productId.image,
        price: hp.productId.price,
        discountPrice: hp.productId.discountPrice,
        slug: hp.productId.slug,
      }));

    return withCORS(NextResponse.json(products));
  } catch (error) {
    console.error("Error fetching hero products:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch hero products" }, { status: 500 }));
  }
}
