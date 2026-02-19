import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
// can u create the image management page for the admin panel

// so in the admin panel and i hv to add one more pages to manage the images in the public folders as u can see we hv the images in the public folder and also u can see we hv the other folders like arrivals blogs carousel shop-by-concern uploads

// so on our manage images we can deletes the images which are not used or related to any product or enetity
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    
    // First element is the folder, rest is the file path
    const folder = params.path[0];
    const filePath = params.path.slice(1).map(segment => decodeURIComponent(segment)).join('/');
    
    console.log('========== FILE SERVE DEBUG ==========');
    console.log('Folder:', folder);
    console.log('File path:', filePath);
    
    const fullPath = path.join(process.cwd(), 'public', folder, filePath);
    console.log('Full path:', fullPath);

    if (!existsSync(fullPath)) {
      console.log('❌ File not found');
      console.log('========================================');
      return new NextResponse('File not found', { status: 404 });
    }

    console.log('✓ File found, serving...');
    console.log('========================================');

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

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('❌ Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}