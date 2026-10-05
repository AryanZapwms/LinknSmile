// app/api/mobile-auth/refresh/route.ts
// Exchanges a refresh token for a new access + refresh token pair. The old
// refresh token stops working immediately (rotation); role, shopId and
// isActive are re-read from the DB (lib/mobile-tokens.ts).
// Clients must refresh one request at a time and always store the newest
// refresh token: re-presenting an old one logs that device out.

import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { rotateRefreshToken } from "@/lib/mobile-tokens";
import { refreshLimiter } from "@/lib/rate-limit";
import { apiError, clientIp } from "@/lib/api-error";
import { refreshRequest } from "@/lib/contracts/auth";

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  if (!refreshLimiter(clientIp(req)).success) {
    return apiError("RATE_LIMITED", "Too many requests. Please try again later.", 429, {}, { "Retry-After": "60" });
  }

  const parsed = refreshRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "refreshToken is required", 400);
  }

  try {
    const result = await rotateRefreshToken(parsed.data.refreshToken, {
      userAgent: req.headers.get("user-agent"),
    });
    switch (result.kind) {
      case "ok":
        return withCORS(NextResponse.json({ success: true, user: result.user, ...result.tokens }));
      case "rotated_race":
        return apiError(
          "REFRESH_TOKEN_ROTATED",
          "This refresh token was just used. Retry with the newest one.",
          401
        );
      case "reuse_detected":
        return apiError("REFRESH_TOKEN_REUSED", "Session expired. Please log in again.", 401);
      case "revoked":
        return apiError("SESSION_REVOKED", "This account is no longer active.", 401);
      default:
        return apiError("REFRESH_TOKEN_INVALID", "Session expired. Please log in again.", 401);
    }
  } catch (error) {
    console.error("[mobile-auth] refresh error:", error);
    return apiError("INTERNAL_ERROR", "Could not refresh session. Please retry.", 500);
  }
}
