import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Address from "@/lib/models/address";
import { getAuthSession } from "@/lib/get-auth-user";

export async function GET(req: NextRequest) {
  await connectDB();
  const session = await getAuthSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addresses = await Address.find({ userId: session.user.id }).sort({
    isDefault: -1,
    createdAt: -1,
  });
  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const session = await getAuthSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { label, name, phone, street, city, state, pincode, isDefault } = body;

  const address = await Address.create({
    userId: session.user.id,
    label,
    name,
    phone,
    street,
    city,
    state,
    pincode,
    isDefault,
  });
  // Only once the new address exists: clearing first left the user with no
  // default address whenever the create failed validation.
  if (isDefault) {
    await Address.updateMany({ userId: session.user.id, _id: { $ne: address._id } }, { isDefault: false });
  }
  return NextResponse.json(address, { status: 201 });
}

