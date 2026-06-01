// app/api/[...path]/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// These are all your real API route folders under app/api/
// The catch-all must NOT intercept these — Next.js handles them directly.
// ─────────────────────────────────────────────────────────────────────────────
const RESERVED_API_PREFIXES = [
  'auth',
  'products',
  'categories',
  'cart',
  'orders',
  'users',
  'vendor',
  'admin',
  'promos',
  'blogs',
  'upload',
  'razorpay',
  'cron',
  'setup',
  'email',
  'debug',
  'test',
  'serve-files',
  'serve-upload',
  'temp-update-categories',
  'mobile-auth',
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await the params (Next.js 15+ requirement)
    const params = await context.params;

    // ✅ Guard: if the first path segment is a real API route, don't intercept it.
    // This fixes the issue where the catch-all swallows all /api/* requests
    // on local dev (Turbopack resolves catch-alls differently than Vercel).
    const firstSegment = params.path[0]?.toLowerCase();
    if (RESERVED_API_PREFIXES.includes(firstSegment)) {
      console.log(`⛔ Catch-all skipping reserved API route: /api/${params.path.join('/')}`);
      return withCORS(new NextResponse('Not Found', { status: 404 }));
    }

    // Decode URL-encoded characters (e.g., %20 for spaces)
    const filePath = params.path.map(segment => decodeURIComponent(segment)).join('/');

    console.log('========== FILE REQUEST DEBUG ==========');
    console.log('Original URL:', request.url);
    console.log('Decoded file path:', filePath);
    console.log('Params received:', params.path);

    // Try to find the file in different public folders
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'uploads', filePath),
      path.join(process.cwd(), 'public', 'arrivals', filePath),
      path.join(process.cwd(), 'public', 'blogs', filePath),
      path.join(process.cwd(), 'public', 'carousel', filePath),
      path.join(process.cwd(), 'public', 'fonts', filePath),
      path.join(process.cwd(), 'public', 'shop-by-concern', filePath),
      path.join(process.cwd(), 'public', filePath), // Root public folder
    ];

    let fullPath = '';
    let foundPath = false;

    // Check which path exists
    for (const possiblePath of possiblePaths) {
      if (existsSync(possiblePath)) {
        fullPath = possiblePath;
        foundPath = true;
        console.log('✓ Found file at:', fullPath);
        break;
      }
    }

    console.log('========================================');

    if (!foundPath) {
      console.log('❌ File not found in any location');
      return withCORS(new NextResponse('File not found', { status: 404 }));
    }

    const fileBuffer = await readFile(fullPath);
    const ext = path.extname(filePath).toLowerCase();

    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.txt': 'text/plain',
    };

    return withCORS(new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }));
  } catch (error) {
    console.error('❌ Error serving file:', error);
    return withCORS(new NextResponse('Internal Server Error', { status: 500 }));
  }
}