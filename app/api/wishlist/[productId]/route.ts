import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Wishlist from "@/lib/models/wishlist";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function DELETE(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await Wishlist.deleteOne({ userId: session.user.id, productId });
  return NextResponse.json({ message: "Removed" });
}