// app/api/hero-products/route.ts
//
// GET — the homepage "Featured" products, in the admin's order. Only
// products a customer can open are listed: switched on, approved and not
// hidden for an expired subscription (lib/storefront-visibility.ts). A
// featured entry whose product fails that, or was deleted, is left out.
import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { HeroProduct } from "@/lib/models/hero-product";
// Registers the Product model for populate("productId") below. Nothing else
// this route imports does.
import "@/lib/models/product";
import { shownProductFilter } from "@/lib/storefront-visibility";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    await connectDB();

    // populate() leaves productId null for a product that does not match.
    const heroProducts = await HeroProduct.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate({
        path: "productId",
        select: "name image price discountPrice slug",
        match: shownProductFilter(),
      });

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
