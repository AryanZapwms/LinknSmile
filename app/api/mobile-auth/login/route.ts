// app/api/mobile-auth/login/route.ts
// Login for the mobile app. Same credential checks as NextAuth's
// authorize() (lib/auth-options.ts), then returns:
// - accessToken / refreshToken (+ expiries): the current scheme — send
//   `Authorization: Bearer <accessToken>`, renew via /api/mobile-auth/refresh.
// - token: DEPRECATED 7-day NextAuth-format JWE that the already-installed
//   app sends as a session cookie. Kept, unchanged, until that app version
//   is retired; new clients must ignore it.

import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyPassword } from "@/lib/auth";
import { encode } from "next-auth/jwt";
import { issueTokenPair } from "@/lib/mobile-tokens";
import { loginLimiter, loginEmailLimiter } from "@/lib/rate-limit";
import { apiError, clientIp } from "@/lib/api-error";
import { mobileLoginRequest } from "@/lib/contracts/auth";

const LEGACY_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

const tooMany = () =>
  apiError("RATE_LIMITED", "Too many login attempts. Please try again later.", 429, {}, { "Retry-After": "60" });

export async function POST(req: NextRequest) {
  if (!loginLimiter(clientIp(req)).success) return tooMany();

  const parsed = mobileLoginRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Email and password are required", 400);
  }
  const email = parsed.data.email.trim().toLowerCase();
  const { password, deviceName } = parsed.data;
  if (!loginEmailLimiter(email).success) return tooMany();

  try {
    await connectDB();
    const userDoc = await User.findOne({ email });

    if (!userDoc) {
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // Google-only accounts have no password; bcrypt would throw on undefined.
    if (!userDoc.password) {
      return apiError(
        "OAUTH_ACCOUNT",
        "This email is registered with Google sign-in. Please sign in with Google.",
        401
      );
    }

    if (!userDoc.isVerified) {
      return apiError("EMAIL_NOT_VERIFIED", "Please verify your email before logging in", 403);
    }

    const isValid = await verifyPassword(password, userDoc.password);
    if (!isValid) {
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // Checked after the password so it doesn't reveal account status to non-owners.
    if (userDoc.isActive === false) {
      return apiError(
        "ACCOUNT_DISABLED",
        "This account has been deactivated. Please contact support.",
        403
      );
    }

    // Auto-link shop if missing for shop_owners (mirrors NextAuth authorize logic)
    let shopId = userDoc.shopId;
    if (userDoc.role === "shop_owner" && !shopId) {
      const Shop = (await import("@/lib/models/shop")).default;
      const shop = await Shop.findOne({ ownerId: userDoc._id });
      if (shop) {
        userDoc.shopId = shop._id;
        await userDoc.save();
        shopId = shop._id;
      }
    }

    const user = {
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name || "User",
      role: userDoc.role || "user",
      shopId: shopId?.toString() || null,
    };

    const tokens = await issueTokenPair(user, {
      userAgent: req.headers.get("user-agent"),
      deviceName,
    });

    // DEPRECATED legacy token — NextAuth's exact format so getServerSession()
    // accepts it as the next-auth.session-token cookie.
    const now = Math.floor(Date.now() / 1000);
    const token = await encode({
      token: {
        ...user,
        sub: user.id,
        iat: now,
        exp: now + LEGACY_TOKEN_MAX_AGE,
        jti: crypto.randomUUID(),
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: LEGACY_TOKEN_MAX_AGE,
    });

    console.log("Mobile login successful", { userId: user.id });

    return withCORS(NextResponse.json({ success: true, token, user, ...tokens }));
  } catch (error: any) {
    console.error("❌ Mobile login error:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
