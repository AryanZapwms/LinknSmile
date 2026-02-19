import { connectDB } from "@/lib/db";
import { Promo } from "@/lib/models/promo";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const query: any = {};
    if (activeOnly) {
      query.isActive = true;
    }

    const promos = await Promo.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(activeOnly ? 1 : undefined); // Return only the highest priority active promo

    return NextResponse.json(promos);
  } catch (error) {
    console.error("Error fetching promos:", error);
    return NextResponse.json(
      { error: "Failed to fetch promos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    //  SECURITY CHECK: Only admins can create promos
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

    const promo = new Promo({
      title,
      message,
      link: link || "",
      linkText: linkText || "",
      backgroundColor: backgroundColor || "#000000",
      textColor: textColor || "#ffffff",
      isActive: isActive ?? true,
      priority: priority || 0,
    });

    await promo.save();

    return NextResponse.json(promo, { status: 201 });
  } catch (error) {
    console.error("Error creating promo:", error);
    return NextResponse.json(
      { error: "Failed to create promo" },
      { status: 500 }
    );
  }
}
