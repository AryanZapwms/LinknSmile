import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const isMalformed = (value: string | null) => value !== null && value.includes(",");

  // TEMPORARY DEBUG LOGGING — added 2026-09-04, see app/api/auth/[...nextauth]/route.ts
  // for context. Logs every request's raw Host/X-Forwarded-Host/X-Forwarded-Proto so we
  // can see whether this middleware ever OBSERVES a duplicated value (this function only
  // reads request.headers — it never sets or appends any header itself). Remove once
  // root-caused.
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    console.error("[AUTH_DEBUG][middleware]", request.method, request.nextUrl.pathname, {
      host: JSON.stringify(host),
      xForwardedHost: JSON.stringify(forwardedHost),
      xForwardedProto: JSON.stringify(request.headers.get("x-forwarded-proto")),
      malformed: isMalformed(host) || isMalformed(forwardedHost),
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
