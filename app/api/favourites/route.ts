import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Favourite from "@/lib/models/Favourite";
import { getAuthSession } from "@/lib/get-auth-user";

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const favourites = await Favourite.find({ userId: session.user.id });
  return NextResponse.json(favourites);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
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

