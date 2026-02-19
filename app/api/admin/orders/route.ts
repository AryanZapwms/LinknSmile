import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { User } from "@/lib/models/user";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const dbUser = await User.findOne({ email: session.user.email });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    //  SECURITY CHECK: Only admins can access this endpoint
    if (dbUser.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    // Fetch all orders for admin
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate("user", "name email phone")
      .populate("items.product", "name price image");

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
