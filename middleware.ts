import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const isMalformed = (value: string | null) => value !== null && value.includes(",");

  // TEMPORARY DEBUG LOGGING — added 2026-09-04, extended 2026-09-17. See
  // app/api/auth/[...nextauth]/route.ts for the full explanation (read
  // directly from next-auth's own source this session): the ERR_INVALID_URL
  // crash comes from next-auth's parseUrl(process.env.NEXTAUTH_URL) — headers
  // never factor in while NEXTAUTH_URL is set, which it always is here. This
  // route only checked Host/X-Forwarded-Host for a literal comma before; now
  // it also samples NEXTAUTH_URL and probes `new URL()` on it directly, from
  // middleware — i.e. a separate PM2 cluster worker/request-lifecycle point
  // than route.ts's log, specifically to check whether the crash correlates
  // with one stale worker (2 instances configured) vs. happening everywhere.
  // Remove once root-caused.
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    let nextauthUrlProbeError: string | null = null;
    if (process.env.NEXTAUTH_URL) {
      try {
        new URL(process.env.NEXTAUTH_URL);
      } catch (e: any) {
        nextauthUrlProbeError = e?.message ?? String(e);
      }
    }
    console.error("[AUTH_DEBUG][middleware]", request.method, request.nextUrl.pathname, {
      host: JSON.stringify(host),
      xForwardedHost: JSON.stringify(forwardedHost),
      xForwardedProto: JSON.stringify(request.headers.get("x-forwarded-proto")),
      malformed: isMalformed(host) || isMalformed(forwardedHost),
      NEXTAUTH_URL: JSON.stringify(process.env.NEXTAUTH_URL),
      NEXTAUTH_URL_commaSplitCount: process.env.NEXTAUTH_URL ? process.env.NEXTAUTH_URL.split(",").length : null,
      nextauthUrlProbeError,
      pid: process.pid,
      nodeAppInstance: process.env.NODE_APP_INSTANCE ?? null,
    });
  }

  if (isMalformed(host) || isMalformed(forwardedHost)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
