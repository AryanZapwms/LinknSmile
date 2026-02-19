import { connectDB } from "@/lib/db";
import { Promo } from "@/lib/models/promo";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const promo = await Promo.findById(id);

    if (!promo) {
      return NextResponse.json({ error: "Promo not found" }, { status: 404 });
    }

    return NextResponse.json(promo);
  } catch (error) {
    console.error("Error fetching promo:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    //  SECURITY CHECK: Only admins can update promos
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      title,
      message,
      link,
      linkText,
      backgroundColor,
      textColor,
      isActive,
      priority,
    } = body;

    const promo = await Promo.findByIdAndUpdate(
      id,
      {
        title,
        message,
        link: link || "",
        linkText: linkText || "",
        backgroundColor: backgroundColor || "#000000",
        textColor: textColor || "#ffffff",
        isActive: isActive ?? true,
        priority: priority || 0,
      },
      { new: true }
    );

    if (!promo) {
      return NextResponse.json({ error: "Promo not found" }, { status: 404 });
    }

    return NextResponse.json(promo);
  } catch (error) {
    console.error("Error updating promo:", error);
    return NextResponse.json(
      { error: "Failed to update promo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    //  SECURITY CHECK: Only admins can delete promos
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    await connectDB();

    const promo = await Promo.findByIdAndDelete(id);

    if (!promo) {
      return NextResponse.json({ error: "Promo not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Promo deleted successfully" });
  } catch (error) {
    console.error("Error deleting promo:", error);
    return NextResponse.json(
      { error: "Failed to delete promo" },
      { status: 500 }
    );
  }
}
