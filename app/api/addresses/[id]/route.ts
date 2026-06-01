import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Address from '@/lib/models/address';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const address = await Address.findOneAndDelete({ _id: id, userId: session.user.id });
  if (!address) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ message: 'Deleted' });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { isDefault, ...updateData } = body;
  if (isDefault) {
    await Address.updateMany({ userId: session.user.id }, { isDefault: false });
  }
  const address = await Address.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { ...updateData, isDefault },
    { new: true }
  );
  if (!address) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(address);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await Address.updateMany({ userId: session.user.id }, { isDefault: false });
  const address = await Address.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { isDefault: true },
    { new: true }
  );
  if (!address) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(address);
}