import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Otp } from "@/lib/models/otp";
import { generateNumericOtp, hashOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/EmailOtp";
import { type NextRequest, NextResponse } from "next/server";

const RESEND_MIN_MS = 30 * 1000;
const MAX_PER_DAY = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body || {};

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectDB();

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingVerifiedUser = await User.findOne({ email: normalizedEmail, isVerified: true });
    if (existingVerifiedUser) {
      return NextResponse.json({ error: "User already verified" }, { status: 400 });
    }

    const latestOtp = await Otp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (!latestOtp || !latestOtp.pendingName || !latestOtp.pendingPassword) {
      return NextResponse.json({ error: "No pending registration found" }, { status: 404 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await Otp.countDocuments({ email: normalizedEmail, createdAt: { $gte: since } });
    if (recentCount >= MAX_PER_DAY) {
      return NextResponse.json({ error: "Too many OTP requests. Try again tomorrow." }, { status: 429 });
    }

    const elapsed = Date.now() - latestOtp.createdAt.getTime();
    if (elapsed < RESEND_MIN_MS) {
      return NextResponse.json({ error: `Please wait ${Math.ceil((RESEND_MIN_MS - elapsed) / 1000)} seconds before resending.` }, { status: 429 });
    }

    const otpPlain = generateNumericOtp(6);
    const otpHash = hashOtp(otpPlain);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email: normalizedEmail });

    await Otp.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      pendingName: latestOtp.pendingName,
      pendingPassword: latestOtp.pendingPassword,
      pendingRole: latestOtp.pendingRole,
    });

    await sendOtpEmail(normalizedEmail, latestOtp.pendingName, otpPlain);

    return NextResponse.json({ message: "OTP resent" }, { status: 200 });
  } catch (error) {
    // console.error("resend-otp error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
