import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Favourite from "@/lib/models/Favourite";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const favourites = await Favourite.find({ userId: session.user.id });
  return NextResponse.json(favourites);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, refId } = await req.json();
  if (!type || !refId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await connectDB();
  const existing = await Favourite.findOne({ userId: session.user.id, type, refId });

  if (existing) {
    // Toggle off — remove it
    await Favourite.deleteOne({ _id: existing._id });
    return NextResponse.json({ added: false });
  }

  await Favourite.create({ userId: session.user.id, type, refId });
  return NextResponse.json({ added: true });
}