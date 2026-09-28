// app/api/auth/reset-password/route.ts
import { withCORS } from "@/lib/cors";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { allowResetCheck, checkResetOtp, RESET_OTP_INVALID_MESSAGE } from "@/lib/reset-otp";

// Same minimum as registration (lib/validation.ts) and change-password.
const MIN_PASSWORD_LENGTH = 6;

export async function POST(req: Request) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return withCORS(NextResponse.json({ error: "Missing required fields" }, { status: 400 }));
    }

    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return withCORS(
        NextResponse.json(
          { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
          { status: 400 }
        )
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!allowResetCheck(req, normalizedEmail)) {
      return withCORS(
        NextResponse.json(
          { error: "Too many attempts. Please wait a few minutes and try again." },
          { status: 429, headers: { "Retry-After": "900" } }
        )
      );
    }

    const user = await checkResetOtp(normalizedEmail, otp);
    if (!user) {
      return withCORS(NextResponse.json({ error: RESET_OTP_INVALID_MESSAGE }, { status: 400 }));
    }

    // Hash and update password
    user.password = await hashPassword(newPassword);

    // Clear OTP fields
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;
    user.markModified("password");
    user.markModified("resetOtpHash");
    user.markModified("resetOtpExpires");

    await user.save();

    return withCORS(NextResponse.json({ message: "Password reset successfully" }));
  } catch (err) {
    console.error("[RESET_PASSWORD]", err);
    return withCORS(NextResponse.json({ error: "Something went wrong" }, { status: 500 }));
  }
}
