//
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { getAuthSession } from "@/lib/get-auth-user";
import { requireVendor } from "@/lib/vendor-guard";

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const guard = await requireVendor(req);
    if (!guard.ok) return guard.response;
    const session = await getAuthSession(req);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ message: "Shop not found" }, { status: 404 }));
    }

    const shop = await Shop.findById(shopId).select("-businessProof");
    if (!shop) {
      return withCORS(NextResponse.json({ message: "Shop not found" }, { status: 404 }));
    }

    return withCORS(
      NextResponse.json({
        success: true,
        shop,
      })
    );
  } catch (error: any) {
    console.error("Fetch vendor settings error:", error);
    return withCORS(
      NextResponse.json(
        { message: "Failed to fetch settings", error: error.message },
        { status: 500 }
      )
    );
  }
}

export async function PUT(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const guard = await requireVendor(req);
    if (!guard.ok) return guard.response;
    const session = await getAuthSession(req);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const shopId = session.user.shopId;
    const body = await req.json();

    // logo and coverImage are not here on purpose: they are set only from
    // uploaded files, by PUT /api/vendor/storefront (lib/shop-storefront.ts).
    const allowedUpdates = [
      "shopName",
      "description",
      "address",
      "contactInfo",
      "bankDetails",
    ];

    const updates: any = {};
    allowedUpdates.forEach((key) => {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    });

    // The web settings form sends bankDetails on every save, with every
    // field blank until the vendor has entered some. All-blank means "not
    // provided": leave what is on file alone rather than reject the save.
    if (
      updates.bankDetails &&
      typeof updates.bankDetails === "object" &&
      Object.values(updates.bankDetails).every((value) => !String(value ?? "").trim())
    ) {
      delete updates.bankDetails;
    }

    // Simple validation for bank details if provided
    if (updates.bankDetails) {
      const { accountNumber, ifscCode, swiftCode, accountHolderName, bankName } =
        updates.bankDetails;

      if (accountNumber && (accountNumber.length < 9 || accountNumber.length > 18)) {
        return withCORS(
          NextResponse.json({ message: "Invalid bank account number length" }, { status: 400 })
        );
      }

      if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
        return withCORS(
          NextResponse.json(
            { message: "Invalid IFSC code format (e.g. HDFC0001234)" },
            { status: 400 }
          )
        );
      }

      if (swiftCode && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swiftCode)) {
        return withCORS(
          NextResponse.json(
            { message: "Invalid SWIFT/BIC code format (e.g. HDFCINBBXXX)" },
            { status: 400 }
          )
        );
      }

      if (!accountHolderName || !bankName) {
        return withCORS(
          NextResponse.json(
            { message: "Account holder name and bank name are required" },
            { status: 400 }
          )
        );
      }
    }

    const shop = await Shop.findByIdAndUpdate(
      shopId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return withCORS(NextResponse.json({ message: "Shop not found" }, { status: 404 }));
    }

    return withCORS(
      NextResponse.json({
        success: true,
        message: "Settings updated successfully",
        shop,
      })
    );
  } catch (error: any) {
    console.error("Update vendor settings error:", error);
    return withCORS(
      NextResponse.json(
        { message: "Failed to update settings", error: error.message },
        { status: 500 }
      )
    );
  }
}

