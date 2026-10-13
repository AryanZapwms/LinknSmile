import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Order } from "@/lib/models/order";
import { deleteAccount } from "@/lib/account-deletion";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    //  SECURITY CHECK: Only admins can update users
    if (!session?.user || session.user.role !== "admin") {
      return withCORS(
        NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 })
      );
    }

    await connectDB();

    const body = await request.json();
    const { role, isActive } = body;

    const user = await User.findByIdAndUpdate(
      id,
      {
        role,
        isActive,
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return withCORS(NextResponse.json({ error: "User not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json(user));
  } catch (error) {
    console.error("Error updating user:", error);
    return withCORS(NextResponse.json({ error: "Failed to update user" }, { status: 500 }));
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    //  SECURITY CHECK: Only admins can delete users
    if (!session?.user || session.user.role !== "admin") {
      return withCORS(
        NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 })
      );
    }

    await connectDB();

    const user = await User.findById(id).select("email shopId deletedAt").lean<any>();

    if (!user) {
      return withCORS(NextResponse.json({ error: "User not found" }, { status: 404 }));
    }

    // Orders reference their customer and are kept as records. Removing the
    // user would leave them pointing at nothing, so a user who has any order
    // is anonymized and deactivated instead, the way self-service deletion
    // does it (lib/account-deletion.ts). A user with no orders is removed.
    const hasOrders = await Order.exists({ user: user._id });
    if (hasOrders) {
      // Nothing left to do when the account is already anonymized (by an
      // earlier call here, or by the user deleting their own account).
      if (!user.deletedAt) {
        await deleteAccount({
          userId: String(user._id),
          shopId: user.shopId ? String(user.shopId) : null,
          email: user.email,
          performedBy: session.user.id,
          reason: "Deleted by an admin; anonymized because the user has orders",
        });
      }
      return withCORS(
        NextResponse.json({
          message:
            "User has orders, so the account was anonymized and deactivated instead of deleted",
          anonymized: true,
        })
      );
    }

    await User.findByIdAndDelete(id);

    return withCORS(NextResponse.json({ message: "User deleted successfully" }));
  } catch (error) {
    console.error("Error deleting user:", error);
    return withCORS(NextResponse.json({ error: "Failed to delete user" }, { status: 500 }));
  }
}
