import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Otp } from "@/lib/models/otp";
import { hashOtp, isExpired } from "@/lib/otp";
import Shop from "@/lib/models/shop";
import { sendEmail, getWelcomeEmail } from "@/lib/email";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body || {};

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and otp required" }, { status: 400 });
    }

    await connectDB();

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingVerifiedUser = await User.findOne({ email: normalizedEmail, isVerified: true });
    if (existingVerifiedUser) {
      await Otp.deleteMany({ email: normalizedEmail });
      return NextResponse.json({ message: "Email already verified" }, { status: 200 });
    }

    const otpDoc = await Otp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (!otpDoc) {
      return NextResponse.json({ error: "No OTP found" }, { status: 400 });
    }

    if (isExpired(otpDoc.expiresAt)) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    if ((otpDoc.attempts || 0) >= 5) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    const otpHash = hashOtp(String(otp));
    if (otpHash !== otpDoc.otpHash) {
      otpDoc.attempts = (otpDoc.attempts || 0) + 1;
      await otpDoc.save();
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    if (!otpDoc.pendingName || !otpDoc.pendingPassword) {
      return NextResponse.json({ error: "Registration data missing" }, { status: 500 });
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      user.name = otpDoc.pendingName;
      user.password = otpDoc.pendingPassword;
      user.role = otpDoc.pendingRole || user.role;
      user.isVerified = true;
      user.phone = otpDoc.pendingPhone || user.phone;
      user.markModified("password");
      await user.save();
    } else {
      user = await User.create({
        name: otpDoc.pendingName,
        email: normalizedEmail,
        password: otpDoc.pendingPassword,
        role: otpDoc.pendingRole || "user",
        phone: otpDoc.pendingPhone,
        isVerified: true,
      });
    }

    // Handle Shop creation for vendors
    if (user.role === "shop_owner" && otpDoc.pendingShopName) {
      let shop = await Shop.findOne({ ownerId: user._id });
      if (!shop) {
        const slug = otpDoc.pendingShopName
          .toLowerCase()
          .replace(/[^\w\s]/gi, "")
          .replace(/\s+/g, "-");
          
        shop = await Shop.create({
          ownerId: user._id,
          shopName: otpDoc.pendingShopName,
          slug: `${slug}-${Date.now()}`,
          description: otpDoc.pendingShopDescription || "",
          address: {
            street: otpDoc.pendingStreet || "",
            city: otpDoc.pendingCity || "",
            state: otpDoc.pendingState || "",
            pincode: otpDoc.pendingPincode || "",
          },
          contactInfo: {
            phone: otpDoc.pendingPhone || user.phone || "",
            email: normalizedEmail,
          },
          isApproved: false,
          isActive: true,
        });

        // Link shop to user
        user.shopId = shop._id;
        await user.save();
      } else {
        // If shop exists but user doesn't have shopId linked
        if (!user.shopId) {
          user.shopId = shop._id;
          await user.save();
        }
      }
    }

    await Otp.deleteMany({ email: normalizedEmail });

    await sendEmail({
      to: normalizedEmail,
      subject: "Welcome to LinkAndSmile",
      html: getWelcomeEmail(user.name),
    });

    return NextResponse.json({ message: "Email verified" }, { status: 200 });
  } catch (err) {
    // console.error("[verify-otp] caught:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
