import NextAuth from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);

// TEMPORARY DEBUG LOGGING — added 2026-09-04 to catch the ERR_INVALID_URL
// "https://x.com, https://x.com" crash live on AE. Logs the raw values
// that feed next-auth's internal URL construction (parseUrl/detectOrigin,
// node_modules/next-auth/utils/{parse-url,detect-origin}.js) BEFORE
// next-auth touches them, so we can see exactly what's malformed instead
// of guessing. Remove once root-caused.
function logAuthRequest(req: NextRequest) {
  try {
    console.error("[AUTH_DEBUG]", req.method, req.nextUrl.pathname + req.nextUrl.search, {
      NEXTAUTH_URL: JSON.stringify(process.env.NEXTAUTH_URL),
      NEXTAUTH_URL_INTERNAL: JSON.stringify(process.env.NEXTAUTH_URL_INTERNAL),
      NEXT_PUBLIC_SITE_URL: JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL),
      host: JSON.stringify(req.headers.get("host")),
      xForwardedHost: JSON.stringify(req.headers.get("x-forwarded-host")),
      xForwardedProto: JSON.stringify(req.headers.get("x-forwarded-proto")),
      origin: JSON.stringify(req.headers.get("origin")),
      pid: process.pid,
    });
  } catch (err) {
    console.error("[AUTH_DEBUG] logging failed:", err);
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  logAuthRequest(req);
  return handler(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  logAuthRequest(req);
  return handler(req, ctx);
}