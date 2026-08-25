import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { HeroProduct } from "@/lib/models/hero-product";
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
    const { isActive } = await request.json();

    const heroProduct = await HeroProduct.findByIdAndUpdate(
      id,
      { $set: { isActive: !!isActive } },
      { new: true }
    );

    if (!heroProduct) {
      return withCORS(NextResponse.json({ error: "Hero product not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json(heroProduct));
  } catch (error) {
    console.error("Error updating hero product:", error);
    return withCORS(NextResponse.json({ error: "Failed to update hero product" }, { status: 500 }));
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

    const heroProduct = await HeroProduct.findByIdAndDelete(id);
    if (!heroProduct) {
      return withCORS(NextResponse.json({ error: "Hero product not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json({ message: "Hero product removed successfully" }));
  } catch (error) {
    console.error("Error removing hero product:", error);
    return withCORS(NextResponse.json({ error: "Failed to remove hero product" }, { status: 500 }));
  }
}
