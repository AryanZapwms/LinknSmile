import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Address from "@/lib/models/address";
import { getAuthSession } from "@/lib/get-auth-user";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

// A user has one default address. Making an address the default therefore
// also un-defaults their others, and that second step must only run once the
// first has succeeded: done the other way round, a request for an address
// that isn't theirs (or doesn't exist) left them with no default at all.
const clearOtherDefaults = (userId: string, keepId: unknown) =>
  Address.updateMany({ userId, _id: { $ne: keepId } }, { isDefault: false });

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const address = await Address.findOneAndDelete({ _id: id, userId: session.user.id });
  if (!address) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "Deleted" });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return notFound();
  const body = await req.json();
  const { isDefault, ...updateData } = body;
  const address = await Address.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { ...updateData, isDefault },
    { new: true }
  );
  if (!address) return notFound();
  if (isDefault) await clearOtherDefaults(session.user.id, address._id);
  return NextResponse.json(address);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return notFound();
  const address = await Address.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { isDefault: true },
    { new: true }
  );
  if (!address) return notFound();
  await clearOtherDefaults(session.user.id, address._id);
  return NextResponse.json(address);
}
