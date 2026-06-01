// app/api/wishlist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';   // ✅ named export
import Wishlist from '@/lib/models/wishlist';
import Product from '@/lib/models/product';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';  

export async function GET(req: NextRequest) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const wishlist = await Wishlist.find({ userId: session.user.id }).populate('productId');
  const items = wishlist.map(item => ({
    _id: item._id,
    productId: item.productId._id,
    name: item.productId.name,
    price: item.productId.price,
    image: item.productId.images?.[0] || '/placeholder.jpg',
  }));
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { productId } = await req.json();
  const existing = await Wishlist.findOne({ userId: session.user.id, productId });
  if (!existing) {
    await Wishlist.create({ userId: session.user.id, productId });
  }
  return NextResponse.json({ message: 'Added' }, { status: 201 });
}