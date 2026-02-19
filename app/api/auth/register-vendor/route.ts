import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import Shop from "@/lib/models/shop";
import { sendOTP } from "@/lib/otp";
import { Otp } from "@/lib/models/otp";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,
      shopName,
      description,
      street,
      city,
      state,
      pincode,
      gstNumber,
      panNumber,
    } = body;

    // Basic validation
    if (!name || !email || !password || !shopName || !street || !city || !state || !pincode) {
      return NextResponse.json(
        { message: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser && existingUser.isVerified) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate OTP
    const { hashedOtp, expiresAt } = await sendOTP(email);

    // Store Registration Data in Otp collection
    // We'll update the Otp model to store these extra fields
    await Otp.create({
      email: email.toLowerCase().trim(),
      otpHash: hashedOtp,
      expiresAt,
      pendingName: name,
      pendingPassword: await bcrypt.hash(password, 10),
      pendingRole: "shop_owner", // Match the User model enum
      // We'll store shop data in a way the verify-otp API can eventually use
      // For now, we'll store them as separate fields (we'll update the model next)
      pendingPhone: phone,
      pendingShopName: shopName,
      pendingShopDescription: description,
      pendingStreet: street,
      pendingCity: city,
      pendingState: state,
      pendingPincode: pincode,
      pendingGstNumber: gstNumber,
      pendingPanNumber: panNumber,
    });

    return NextResponse.json({
      success: true,
      message: "Vendor registration initiated. Please verify your email to complete the process.",
      email: email,
    }, { status: 201 });

  } catch (error: any) {
    console.error("Vendor registration error:", error);
    return NextResponse.json(
      { message: "Registration failed. Please try again.", error: error.message },
      { status: 500 }
    );
  }
}