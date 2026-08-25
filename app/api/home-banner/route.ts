import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { HomeBanner } from "@/lib/models/home-banner";
import Shop from "@/lib/models/shop";
import { NextResponse, type NextRequest } from "next/server";

async function resolveHref(linkType: string, linkValue?: string): Promise<string | null> {
  if (!linkValue) return null;
  if (linkType === "product") return `/products/${linkValue}`;
  if (linkType === "url") return linkValue;
  if (linkType === "shop") {
    const shop = await Shop.findById(linkValue).select("slug");
    return shop ? `/shop/${shop.slug}` : null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    await connectDB();

    const banners = await HomeBanner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });

    const resolved = await Promise.all(
      banners.map(async (banner) => ({
        _id: (banner._id as any).toString(),
        url: banner.imageUrl,
        title: banner.title,
        description: banner.description,
        href: await resolveHref(banner.linkType, banner.linkValue),
      }))
    );

    return withCORS(NextResponse.json(resolved));
  } catch (error) {
    console.error("Error fetching home banners:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch home banners" }, { status: 500 }));
  }
}
