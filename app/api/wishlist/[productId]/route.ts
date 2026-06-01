import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Wishlist from '@/lib/models/wishlist';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';   // ← fixed path

export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  await Wishlist.deleteOne({ userId: session.user.id, productId: params.productId });
  return NextResponse.json({ message: 'Removed' });
}