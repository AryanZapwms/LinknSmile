// app/api/mobile-auth/logout/route.ts
// Revokes this device's login (its refresh-token family) and removes its
// push token from the user. Always 200, also for unknown or already-revoked
// tokens, so the app can clear local state unconditionally. The access
// token stays valid until it expires (≤15 min); the app must drop it.

import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { revokeRefreshToken } from "@/lib/mobile-tokens";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiError } from "@/lib/api-error";
import { logoutRequest } from "@/lib/contracts/auth";

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const parsed = logoutRequest.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid logout request", 400);
  }
  const { refreshToken, pushToken } = parsed.data;

  try {
    const ownerId = refreshToken ? await revokeRefreshToken(refreshToken) : null;
    // The push token is only removed from a user this caller proved to be:
    // the refresh token's owner, or the Bearer/session user.
    const userId = ownerId ?? (await getAuthUser(req))?.id ?? null;
    if (pushToken && userId) {
      await connectDB();
      await User.updateOne({ _id: userId }, { $pull: { pushTokens: pushToken } });
    }
    return withCORS(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("[mobile-auth] logout error:", error);
    return apiError("INTERNAL_ERROR", "Could not log out. Please retry.", 500);
  }
}
