// app/api/mobile-auth/login/route.ts
// Dedicated login endpoint for the mobile app.
// Reuses the same credential verification logic as NextAuth but returns
// a signed JWT directly instead of setting a cookie session.

import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyPassword } from "@/lib/auth";
import { encode } from "next-auth/jwt";

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, password } = await req.json();

    if (!rawEmail || !password) {
      return withCORS(
        NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        )
      );
    }

    const email = rawEmail.trim().toLowerCase();

    await connectDB();
    const userDoc = await User.findOne({ email });

    if (!userDoc) {
      return withCORS(
        NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      );
    }

    if (!userDoc.isVerified) {
      return withCORS(
        NextResponse.json(
          { error: "Please verify your email before logging in" },
          { status: 403 }
        )
      );
    }

    const isValid = await verifyPassword(password, userDoc.password);
    if (!isValid) {
      return withCORS(
        NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
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

    const secret = process.env.NEXTAUTH_SECRET!;

    // ✅ Build a JWT token in NextAuth's exact format so getServerSession()
    // can validate it when sent as the next-auth.session-token cookie.
    const token = await encode({
      token: {
        id: userDoc._id.toString(),
        email: userDoc.email,
        name: userDoc.name || "User",
        role: userDoc.role || "user",
        shopId: shopId?.toString() || null,
        // Required NextAuth fields
        sub: userDoc._id.toString(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
        jti: crypto.randomUUID(),
      },
      secret,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    const user = {
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name || "User",
      role: userDoc.role || "user",
      shopId: shopId?.toString() || null,
    };
    

    console.log(`✅ Mobile login successful for: ${email}`);

    return withCORS(
      NextResponse.json({
        success: true,
        token,   // ← save this in SecureStore, send as Cookie on every request
        user,
      })
    );
  } catch (error: any) {
    console.error("❌ Mobile login error:", error);
    return withCORS(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}