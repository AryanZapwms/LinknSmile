import { NextResponse } from 'next/server';
import { withCORS } from '@/lib/cors';

export async function GET(request: Request) {
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return withCORS(new NextResponse(null));
  }

  // Return a simple test message
  const data = { message: 'API is working!' };
  return withCORS(new NextResponse(JSON.stringify(data)));
}