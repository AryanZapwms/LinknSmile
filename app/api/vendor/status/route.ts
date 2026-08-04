import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { getSubscriptionAccessState } from "@/lib/vendor-subscription-status";

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const shopId = session.user.shopId;

    if (!shopId) {
      return withCORS(
        NextResponse.json(
          {
            success: false,
            isApproved: false,
            message: "Shop not found",
          },
          { status: 404 }
        )
      );
    }

    const shop = await Shop.findById(shopId).select("isApproved isActive");

    if (!shop) {
      return withCORS(
        NextResponse.json(
          {
            success: false,
            isApproved: false,
            message: "Shop not found",
          },
          { status: 404 }
        )
      );
    }

    const subscription = await VendorSubscription.findOne({ shopId }).lean();
    const access = getSubscriptionAccessState(subscription);

    return withCORS(
      NextResponse.json({
        success: true,
        isApproved: shop.isApproved,
        isActive: shop.isActive,
        subscription: {
          status: access.status,
          expiryDate: subscription?.expiryDate ?? null,
          daysUntilExpiry: access.daysUntilExpiry,
          isInGracePeriod: access.isInGracePeriod,
          isBlocked: access.isBlocked,
        },
      })
    );
  } catch (error: any) {
    return withCORS(
      NextResponse.json(
        { success: false, isApproved: false, message: error.message },
        { status: 500 }
      )
    );
  }
}

