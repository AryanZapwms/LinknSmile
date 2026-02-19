// import { NextRequest, NextResponse } from 'next/server';
// import { readFile } from 'fs/promises';
// import path from 'path';
// import { existsSync } from 'fs';

// export async function GET(
//   request: NextRequest,
//   context: { params: Promise<{ path: string[] }> }
// ) {
//   try {
//     const params = await context.params;
//     const filePath = params.path.map(segment => decodeURIComponent(segment)).join('/');
    
//     console.log('========== FILE REQUEST DEBUG ==========');
//     console.log('Requested file path:', filePath);
    
//     const possiblePaths = [
//       path.join(process.cwd(), 'public', 'uploads', filePath),
//       path.join(process.cwd(), 'public', 'arrivals', filePath),
//       path.join(process.cwd(), 'public', 'blogs', filePath),
//       path.join(process.cwd(), 'public', 'carousel', filePath),
//       path.join(process.cwd(), 'public', 'fonts', filePath),
//       path.join(process.cwd(), 'public', 'shop-by-concern', filePath),
//       path.join(process.cwd(), 'public', filePath),
//     ];

//     let fullPath = '';
//     let foundPath = false;

//     for (const possiblePath of possiblePaths) {
//       console.log('Checking:', possiblePath);
//       if (existsSync(possiblePath)) {
//         fullPath = possiblePath;
//         foundPath = true;
//         console.log('✓ Found file at:', fullPath);
//         break;
//       }
//     }

//     console.log('========================================');

//     if (!foundPath) {
//       console.log('❌ File not found in any location');
//       return new NextResponse('File not found', { status: 404 });
//     }

//     const fileBuffer = await readFile(fullPath);
//     const ext = path.extname(filePath).toLowerCase();

//     const contentTypes: Record<string, string> = {
//       '.jpg': 'image/jpeg',
//       '.jpeg': 'image/jpeg',
//       '.png': 'image/png',
//       '.gif': 'image/gif',
//       '.webp': 'image/webp',
//       '.svg': 'image/svg+xml',
//       '.ico': 'image/x-icon',
//       '.woff': 'font/woff',
//       '.woff2': 'font/woff2',
//       '.ttf': 'font/ttf',
//       '.otf': 'font/otf',
//       '.txt': 'text/plain',
//     };

//     return new NextResponse(fileBuffer, {
//       status: 200,
//       headers: {
//         'Content-Type': contentTypes[ext] || 'application/octet-stream',
//         'Cache-Control': 'public, max-age=31536000, immutable',
//       },
//     });
//   } catch (error) {
//     console.error('❌ Error serving file:', error);
//     return new NextResponse('Internal Server Error', { status: 500 });
//   }
// }



import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await the params (Next.js 15+ requirement)
    const params = await context.params;
    
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
      console.log('Checking:', possiblePath);
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
      return new NextResponse('File not found', { status: 404 });
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

