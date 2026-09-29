import { withCORS } from "@/lib/cors";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { sendOtpEmail } from "@/lib/EmailOtp";
import { resolveEmailLocale } from "@/lib/email-locale";
import { hash } from "bcryptjs";
import { resetRequestLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/reset-otp";
import { generateNumericOtp } from "@/lib/otp";

export async function POST(req: Request) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return withCORS(NextResponse.json({ error: "Email is required" }, { status: 400 }));
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const byIp = resetRequestLimiter(`ip:${clientIp(req)}`);
    const byEmail = resetRequestLimiter(`email:${normalizedEmail}`);
    if (!byIp.success || !byEmail.success) {
      return withCORS(
        NextResponse.json(
          { error: "Too many requests. Please wait a few minutes and try again." },
          { status: 429, headers: { "Retry-After": "900" } }
        )
      );
    }

    await connectDB();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Same response as the success path, so this can't be used to check
      // which emails have accounts.
      return withCORS(NextResponse.json({ message: "OTP sent successfully" }));
    }

    // Generate OTP and expiry
    const otp = generateNumericOtp(6);
    // console.log("[FORGOT_PASSWORD] Generated OTP:", otp)
    const otpHash = await hash(otp, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    // Store hashed OTP in DB
    user.resetOtpHash = otpHash;
    user.resetOtpExpires = expiresAt;
    user.resetOtpAttempts = 0; // fresh code, fresh attempt budget (lib/reset-otp.ts)
    user.markModified("resetOtpHash");
    user.markModified("resetOtpExpires");
    const savedUser = await user.save();
    // console.log("[FORGOT_PASSWORD] OTP hash stored for:", normalizedEmail)
    // console.log("[FORGOT_PASSWORD] Saved user data:", {
    //   email: savedUser.email,
    //   hasHash: !!savedUser.resetOtpHash,
    //   hasExpiry: !!savedUser.resetOtpExpires
    // })

    // Send email — uses the user's own current locale preference (kept in
    // sync by lib/actions/locale.ts on every switch), not the requesting
    // browser's cookie, since a forgot-password request may come from a
    // different device/browser than the one they normally use.
    await sendOtpEmail(user.email, user.name, otp, resolveEmailLocale(user.locale));
    // console.log("[FORGOT_PASSWORD] OTP email sent to:", user.email)

    return withCORS(NextResponse.json({ message: "OTP sent successfully" }));
  } catch (err) {
    // console.error("[FORGOT_PASSWORD]", err)
    return withCORS(NextResponse.json({ error: "Something went wrong" }, { status: 500 }));
  }
}
