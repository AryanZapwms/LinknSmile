import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Otp } from "@/lib/models/otp";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { type NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/EmailOtp";
import { generateNumericOtp, hashOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    await connectDB();

    const normalizedEmail = validation.data.email.trim().toLowerCase();

    const existingVerifiedUser = await User.findOne({ email: normalizedEmail, isVerified: true });
    if (existingVerifiedUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    await User.deleteMany({ email: normalizedEmail, isVerified: false });

    await Otp.deleteMany({ email: normalizedEmail });

    const hashedPassword = await hashPassword(validation.data.password);

    const otpPlain = generateNumericOtp(6);
    const otpHash = hashOtp(otpPlain);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      pendingName: validation.data.name.trim(),
      pendingPassword: hashedPassword,
      pendingRole: "user",
    });

    await sendOtpEmail(normalizedEmail, validation.data.name.trim(), otpPlain);

    return NextResponse.json(
      {
        message: "OTP sent to email.",
        email: normalizedEmail,
      },
      { status: 201 },
    );
  } catch (error) {
    // console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
