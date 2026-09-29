// lib/reset-otp.ts
//
// Shared password-reset OTP check for app/api/auth/verify-reset-otp and
// app/api/auth/reset-password. Every failure mode returns the same generic
// result so responses can't be used to enumerate accounts, and each OTP
// allows at most MAX_RESET_OTP_ATTEMPTS wrong guesses before it's discarded.

import { compare } from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { resetCheckLimiter } from "@/lib/rate-limit";

export const MAX_RESET_OTP_ATTEMPTS = 5;

export const RESET_OTP_INVALID_MESSAGE = "Invalid or expired code. Please request a new one.";

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** Returns false if either the IP or the email has exceeded the check limit. */
export function allowResetCheck(req: Request, email: string): boolean {
  const byIp = resetCheckLimiter(`ip:${clientIp(req)}`);
  const byEmail = resetCheckLimiter(`email:${email}`);
  return byIp.success && byEmail.success;
}

/**
 * Checks `otp` against the user's current reset OTP. Returns the user
 * document on success, or null on any failure (unknown email, no OTP
 * requested, expired, wrong code, or too many attempts).
 */
export async function checkResetOtp(email: string, otp: unknown) {
  await connectDB();

  // Claim one attempt atomically before comparing, so parallel requests
  // can't get more than MAX_RESET_OTP_ATTEMPTS guesses at one OTP.
  const user = await User.findOneAndUpdate(
    {
      email,
      resetOtpHash: { $exists: true, $ne: null },
      resetOtpExpires: { $gt: new Date() },
      $or: [
        { resetOtpAttempts: { $lt: MAX_RESET_OTP_ATTEMPTS } },
        { resetOtpAttempts: { $exists: false } },
      ],
    },
    { $inc: { resetOtpAttempts: 1 } },
    { new: true }
  );

  if (!user) {
    // Unknown email, no/expired OTP, or already locked out. If an OTP is
    // still stored but exhausted, discard it so a new one must be requested.
    await User.updateOne(
      { email, resetOtpAttempts: { $gte: MAX_RESET_OTP_ATTEMPTS } },
      { $unset: { resetOtpHash: 1, resetOtpExpires: 1 }, $set: { resetOtpAttempts: 0 } }
    );
    return null;
  }

  const isValid = await compare(String(otp).trim(), user.resetOtpHash);

  if (!isValid) {
    if (user.resetOtpAttempts >= MAX_RESET_OTP_ATTEMPTS) {
      await User.updateOne(
        { _id: user._id },
        { $unset: { resetOtpHash: 1, resetOtpExpires: 1 }, $set: { resetOtpAttempts: 0 } }
      );
    }
    return null;
  }

  // Correct code: give the claimed attempt back, so only wrong guesses count
  // (the normal web flow checks the same code twice — verify, then reset).
  await User.updateOne({ _id: user._id }, { $inc: { resetOtpAttempts: -1 } });
  return user;
}
