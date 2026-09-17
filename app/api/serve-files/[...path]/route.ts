import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// Extensions this route is allowed to serve. Anything outside this list is
// rejected before the filesystem is touched — closes off exposure of stray
// non-asset files (.env, .git/*, config/source dumps, etc.) that might end
// up under public/, independent of the traversal check below.
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".txt",
]);

function isAllowedRequestPath(filePath: string): boolean {
  const segments = filePath.split("/");
  if (segments.some((s) => s.startsWith("."))) return false; // reject dotfiles/dotfolders, e.g. .env, .git
  const ext = path.extname(segments[segments.length - 1] ?? "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const params = await context.params;

    // First element is the folder, rest is the file path
    const folder = params.path[0];
    const filePath = params.path
      .slice(1)
      .map((segment) => decodeURIComponent(segment))
      .join("/");

    console.log("========== FILE SERVE DEBUG ==========");
    console.log("Folder:", folder);
    console.log("File path:", filePath);

    if (!folder || !isAllowedRequestPath(filePath ? `${folder}/${filePath}` : folder)) {
      console.log("❌ Path rejected by extension/dotfile allowlist");
      console.log("========================================");
      return withCORS(new NextResponse("File not found", { status: 404 }));
    }

    const PUBLIC_DIR = path.resolve(process.cwd(), "public");
    const fullPath = path.resolve(PUBLIC_DIR, folder, filePath);
    console.log("Full path:", fullPath);

    if (!fullPath.startsWith(PUBLIC_DIR + path.sep)) {
      console.log("❌ Path escapes public directory, rejecting");
      console.log("========================================");
      return withCORS(new NextResponse("File not found", { status: 404 }));
    }

    if (!existsSync(fullPath)) {
      console.log("❌ File not found");
      console.log("========================================");
      return withCORS(new NextResponse("File not found", { status: 404 }));
    }

    console.log("✓ File found, serving...");
    console.log("========================================");

    const fileBuffer = await readFile(fullPath);
    const ext = path.extname(filePath).toLowerCase();

    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".otf": "font/otf",
      ".txt": "text/plain",
    };

    return withCORS(
      new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentTypes[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    );
  } catch (error) {
    console.error("❌ Error serving file:", error);
    return withCORS(new NextResponse("Internal Server Error", { status: 500 }));
  }
}
