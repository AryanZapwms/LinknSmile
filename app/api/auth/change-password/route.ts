// app/api/auth/change-password/route.ts
import { withCORS } from "@/lib/cors";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { compare } from "bcryptjs";
import { hashPassword } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function POST(req: Request) {
  try {
    const { currentPassword, newPassword } = await req.json();

    // ── Validate input ──────────────────────────────────────────────────────
    if (!currentPassword || !newPassword) {
      return withCORS(
        NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      );
    }

    if (newPassword.length < 6) {
      return withCORS(
        NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        )
      );
    }

    if (currentPassword === newPassword) {
      return withCORS(
        NextResponse.json(
          { error: "New password must be different from current password" },
          { status: 400 }
        )
      );
    }

    // ── Authenticate caller ─────────────────────────────────────────────────
    // Mobile sends the NextAuth JWT as a Cookie header (handled by api.ts
    // interceptor), so getServerSession works identically for web and mobile.
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return withCORS(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const email = session.user.email.trim().toLowerCase();

    // ── Fetch user with password field ──────────────────────────────────────
    await connectDB();
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return withCORS(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // ── Verify current password ─────────────────────────────────────────────
    const isCorrect = await compare(currentPassword, user.password);

    if (!isCorrect) {
      return withCORS(
        NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        )
      );
    }

    // ── Hash and persist new password ───────────────────────────────────────
    user.password = await hashPassword(newPassword);
    user.markModified("password");
    await user.save();

    return withCORS(
      NextResponse.json({ message: "Password changed successfully" })
    );
  } catch (err) {
    console.error("[CHANGE_PASSWORD]", err);
    return withCORS(
      NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    );
  }
}


