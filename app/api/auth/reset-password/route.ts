import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/user"
import { compare } from "bcryptjs"
import { hashPassword } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    // console.log("[RESET_PASSWORD] Resetting password for:", normalizedEmail)

    await connectDB()
    const user = await User.findOne({ email: normalizedEmail })
    
    if (!user) {
      // console.log("[RESET_PASSWORD] User not found")
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }

    if (!user.resetOtpHash || !user.resetOtpExpires) {
      // console.log("[RESET_PASSWORD] No OTP hash or expiry stored")
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }

    if (new Date() > user.resetOtpExpires) {
      // console.log("[RESET_PASSWORD] OTP expired")
      return NextResponse.json({ error: "OTP expired" }, { status: 400 })
    }

    const cleanOtp = String(otp).trim()
    // console.log("[RESET_PASSWORD] Verifying OTP...")
    const isValid = await compare(cleanOtp, user.resetOtpHash)
    // console.log("[RESET_PASSWORD] OTP valid:", isValid)
    
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 })
    }

    // Hash and update password
    user.password = await hashPassword(newPassword)

    // Clear OTP fields
    user.resetOtpHash = undefined
    user.resetOtpExpires = undefined
    user.markModified('password')
    user.markModified('resetOtpHash')
    user.markModified('resetOtpExpires')

    await user.save()
    // console.log("[RESET_PASSWORD] Password reset successfully for:", normalizedEmail)

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (err) {
    // console.error("[RESET_PASSWORD]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
