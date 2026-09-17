import NextAuth from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);

// TEMPORARY DEBUG LOGGING — added 2026-09-04, extended 2026-09-17 to catch
// the ERR_INVALID_URL "https://x.com, https://x.com" crash live on AE.
//
// Read node_modules/next-auth/src/utils/detect-origin.ts and parse-url.ts
// directly (2026-09-17): the actual `new URL()` call that can throw is
// parse-url.ts:22, fed by detect-origin.ts's `detectOrigin(forwardedHost,
// protocol)`, which returns `process.env.NEXTAUTH_URL` UNCONDITIONALLY
// whenever it's set — headers are never consulted in that case. So the
// Origin/Host/X-Forwarded-Host headers logged below do NOT feed this crash
// when NEXTAUTH_URL is set (it's a required env var here, so it always is);
// `replicateNextAuthOrigin` below reproduces detectOrigin's exact logic so
// we can see the precise value next-auth's parseUrl() receives, and
// `originUrlProbeError` calls `new URL()` on that same value ourselves so
// the log says definitively whether *this* value is what throws, instead
// of inferring it from a stack trace. Remove all of this once root-caused.
function replicateNextAuthOrigin(forwardedHost: string | null, protocol: string | null): string | undefined {
  // Mirrors next-auth/src/utils/detect-origin.ts verbatim.
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL || process.env.AUTH_TRUST_HOST) {
    return `${protocol === "http" ? "http" : "https"}://${forwardedHost}`;
  }
  return process.env.NEXTAUTH_URL;
}

function commaSplitCount(value: string | undefined): number | null {
  return value ? value.split(",").length : null;
}

function logAuthRequest(req: NextRequest) {
  try {
    const host = req.headers.get("host");
    const xForwardedHost = req.headers.get("x-forwarded-host");
    const xForwardedProto = req.headers.get("x-forwarded-proto");

    // Exactly what detectOrigin(headers["x-forwarded-host"] ?? headers.host, ...)
    // would compute — see core/index.ts's toInternalRequest.
    const nextAuthOriginCandidate = replicateNextAuthOrigin(xForwardedHost ?? host, xForwardedProto);
    let originUrlProbeError: string | null = null;
    if (nextAuthOriginCandidate) {
      try {
        new URL(nextAuthOriginCandidate);
      } catch (e: any) {
        originUrlProbeError = e?.message ?? String(e);
      }
    }

    console.error("[AUTH_DEBUG]", req.method, req.nextUrl.pathname + req.nextUrl.search, {
      NEXTAUTH_URL: JSON.stringify(process.env.NEXTAUTH_URL),
      NEXTAUTH_URL_commaSplitCount: commaSplitCount(process.env.NEXTAUTH_URL),
      NEXTAUTH_URL_INTERNAL: JSON.stringify(process.env.NEXTAUTH_URL_INTERNAL),
      NEXT_PUBLIC_SITE_URL: JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL),
      NEXT_PUBLIC_SITE_URL_commaSplitCount: commaSplitCount(process.env.NEXT_PUBLIC_SITE_URL),
      host: JSON.stringify(host),
      xForwardedHost: JSON.stringify(xForwardedHost),
      xForwardedProto: JSON.stringify(xForwardedProto),
      origin: JSON.stringify(req.headers.get("origin")), // the CORS request header — unrelated to next-auth's internal detectOrigin(), kept for completeness only
      nextAuthOriginCandidate: JSON.stringify(nextAuthOriginCandidate),
      // If this is non-null, THIS is the exact value + exact reason next-auth's
      // own parseUrl() is about to throw ERR_INVALID_URL on this request.
      originUrlProbeError,
      pid: process.pid,
      nodeAppInstance: process.env.NODE_APP_INSTANCE ?? null,
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