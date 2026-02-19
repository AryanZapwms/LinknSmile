import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/user"
import { sendOtpEmail } from "@/lib/EmailOtp"
import { hash } from "bcryptjs"

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString() // 6-digit OTP
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    // console.log("[FORGOT_PASSWORD] Generating OTP for:", normalizedEmail)
    await connectDB()

    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return NextResponse.json({ error: "No account found with that email" }, { status: 404 })
    }

    // Generate OTP and expiry
    const otp = generateOtp()
    // console.log("[FORGOT_PASSWORD] Generated OTP:", otp)
    const otpHash = await hash(otp, 12)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min expiry

    // Store hashed OTP in DB
    user.resetOtpHash = otpHash
    user.resetOtpExpires = expiresAt
    user.markModified('resetOtpHash')
    user.markModified('resetOtpExpires')
    const savedUser = await user.save()
    // console.log("[FORGOT_PASSWORD] OTP hash stored for:", normalizedEmail)
    // console.log("[FORGOT_PASSWORD] Saved user data:", {
    //   email: savedUser.email,
    //   hasHash: !!savedUser.resetOtpHash,
    //   hasExpiry: !!savedUser.resetOtpExpires
    // })

    // Send email
    await sendOtpEmail(user.email, user.name, otp)
    // console.log("[FORGOT_PASSWORD] OTP email sent to:", user.email)

    return NextResponse.json({ message: "OTP sent successfully" })
  } catch (err) {
    // console.error("[FORGOT_PASSWORD]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
