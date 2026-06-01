import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Address from '@/lib/models/address';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const addresses = await Address.find({ userId: session.user.id }).sort({ isDefault: -1, createdAt: -1 });
  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const { label, name, phone, street, city, state, pincode, isDefault } = body;
  
  if (isDefault) {
    await Address.updateMany({ userId: session.user.id }, { isDefault: false });
  }
  
  const address = await Address.create({ userId: session.user.id, label, name, phone, street, city, state, pincode, isDefault });
  return NextResponse.json(address, { status: 201 });
}