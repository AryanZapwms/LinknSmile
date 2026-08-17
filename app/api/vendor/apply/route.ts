// app/api/vendor/apply/route.ts
// Lets an already-authenticated user (e.g. one who just signed up via Google)
// submit shop details and become a vendor, without going through the
// password + OTP registration flow. Creates the Shop exactly the way
// app/api/auth/verify-otp/route.ts does for the existing vendor signup path,
// so admin-side approval works identically either way.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import Shop from "@/lib/models/shop";

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return withCORS(NextResponse.json({ error: "User not found" }, { status: 404 }));
    }

    if (user.role === "shop_owner" || user.shopId) {
      return withCORS(
        NextResponse.json({ error: "You already have a vendor account" }, { status: 400 })
      );
    }

    const body = await req.json();
    const { shopName, description, phone, street, city, state, pincode, gstNumber, panNumber } =
      body;

    if (!shopName || !street || !city || !state || !pincode) {
      return withCORS(
        NextResponse.json(
          { error: "Please fill in all required shop and address fields." },
          { status: 400 }
        )
      );
    }

    const slug = String(shopName)
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");

    const shop = await Shop.create({
      ownerId: user._id,
      shopName,
      slug: `${slug}-${Date.now()}`,
      description: description || "",
      address: { street, city, state, pincode, country: "India" },
      contactInfo: { phone: phone || user.phone || "", email: user.email },
      gstNumber: gstNumber || undefined,
      panNumber: panNumber || undefined,
      isApproved: false,
      isActive: true,
    });

    user.role = "shop_owner";
    user.shopId = shop._id;
    user.pendingVendorApplication = false;
    if (phone && !user.phone) user.phone = phone;
    await user.save();

    return withCORS(
      NextResponse.json({ success: true, shopId: (shop._id as any).toString() })
    );
  } catch (error) {
    console.error("Error submitting vendor application:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to submit application" }, { status: 500 })
    );
  }
}
