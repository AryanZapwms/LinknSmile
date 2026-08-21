import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { HomeBanner } from "@/lib/models/home-banner";
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
    const banners = await HomeBanner.find().sort({ sortOrder: 1, createdAt: 1 });

    return withCORS(NextResponse.json(banners));
  } catch (error) {
    console.error("Error fetching home banners:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch home banners" }, { status: 500 }));
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

    const body = await request.json();
    const { imageUrl, title, description, linkType, linkValue, isActive } = body;

    if (!imageUrl?.trim()) {
      return withCORS(NextResponse.json({ error: "Image is required" }, { status: 400 }));
    }

    const lastBanner = await HomeBanner.findOne().sort({ sortOrder: -1 });
    const nextSortOrder = (lastBanner?.sortOrder ?? -1) + 1;

    const banner = await HomeBanner.create({
      imageUrl: imageUrl.trim(),
      title: title?.trim() || undefined,
      description: description?.trim() || undefined,
      linkType: linkType || "none",
      linkValue: linkValue?.trim() || undefined,
      isActive: isActive ?? true,
      sortOrder: nextSortOrder,
    });

    return withCORS(NextResponse.json(banner, { status: 201 }));
  } catch (error) {
    console.error("Error creating home banner:", error);
    return withCORS(NextResponse.json({ error: "Failed to create home banner" }, { status: 500 }));
  }
}
