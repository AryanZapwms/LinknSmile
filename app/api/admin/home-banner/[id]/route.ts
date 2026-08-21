import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { HomeBanner } from "@/lib/models/home-banner";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const banner = await HomeBanner.findByIdAndUpdate(
      id,
      {
        imageUrl: imageUrl.trim(),
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        linkType: linkType || "none",
        linkValue: linkValue?.trim() || undefined,
        isActive: isActive ?? true,
      },
      { new: true }
    );

    if (!banner) {
      return withCORS(NextResponse.json({ error: "Banner not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json(banner));
  } catch (error) {
    console.error("Error updating home banner:", error);
    return withCORS(NextResponse.json({ error: "Failed to update home banner" }, { status: 500 }));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const banner = await HomeBanner.findByIdAndDelete(id);
    if (!banner) {
      return withCORS(NextResponse.json({ error: "Banner not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json({ message: "Banner deleted successfully" }));
  } catch (error) {
    console.error("Error deleting home banner:", error);
    return withCORS(NextResponse.json({ error: "Failed to delete home banner" }, { status: 500 }));
  }
}
