import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/user"
import { compare } from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 })
    }

    await connectDB()

    const normalizedEmail = String(email).trim().toLowerCase()
    // console.log("[VERIFY_RESET_OTP] Checking OTP for email:", normalizedEmail)
    // console.log("[VERIFY_RESET_OTP] OTP received:", otp)
    
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      // console.log("[VERIFY_RESET_OTP] User not found")
      return NextResponse.json({ error: "User not found" }, { status: 400 })
    }
    
    if (!user.resetOtpHash) {
      // console.log("[VERIFY_RESET_OTP] No OTP hash stored")
      return NextResponse.json({ error: "No OTP requested for this email" }, { status: 400 })
    }
    
    if (!user.resetOtpExpires) {
      // console.log("[VERIFY_RESET_OTP] No OTP expiry")
      return NextResponse.json({ error: "OTP expired" }, { status: 400 })
    }

    // Check expiry
    if (new Date() > user.resetOtpExpires) {
      // console.log("[VERIFY_RESET_OTP] OTP expired:", new Date(), ">", user.resetOtpExpires)
      return NextResponse.json({ error: "OTP expired" }, { status: 400 })
    }

    // Verify OTP (bcrypt compare) - trim whitespace from OTP
    const cleanOtp = String(otp).trim()
    // console.log("[VERIFY_RESET_OTP] Clean OTP:", cleanOtp)
    const isValid = await compare(cleanOtp, user.resetOtpHash)
    console.log("[VERIFY_RESET_OTP] OTP valid:", isValid)
    // 
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 })
    }

    //  OTP valid — return success (don't clear yet, reset-password will do that)
    // console.log("[VERIFY_RESET_OTP] OTP verification successful for:", normalizedEmail)
    return NextResponse.json({ message: "OTP verified successfully" })
  } catch (err) {
    // console.error("[VERIFY_RESET_OTP]", err)
    return NextResponse.json({ error: "Something went wrong: " + String(err) }, { status: 500 })
  }
}
