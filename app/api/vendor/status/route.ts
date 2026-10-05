import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { getSubscriptionAccessState } from "@/lib/vendor-subscription-status";
import { VendorMouAcceptance } from "@/lib/models/vendor-mou-acceptance";
import { CURRENT_MOU_VERSION } from "@/lib/mou-content";
import { vendorBlockCode } from "@/lib/vendor-guard";
import { getAuthSession } from "@/lib/get-auth-user";

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getAuthSession(req);

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

    const mouAcceptance = await VendorMouAcceptance.findOne({
      userId: session.user.id,
      mouVersion: CURRENT_MOU_VERSION,
    }).select("_id");

    return withCORS(
      NextResponse.json({
        success: true,
        isApproved: shop.isApproved,
        isActive: shop.isActive,
        mouAccepted: !!mouAcceptance,
        mouVersion: CURRENT_MOU_VERSION,
        // First gate that blocks the selling features, or null — same order
        // as lib/vendor-guard.ts. MOU_REQUIRED blocks the whole vendor area;
        // SUBSCRIPTION_EXPIRED blocks orders/products/coupons/reviews only
        // (wallet, payouts, bank details stay open). Selling features also
        // need isApproved (SHOP_PENDING).
        blockingCode: vendorBlockCode(
          { mouAccepted: !!mouAcceptance, access, isApproved: !!shop.isApproved },
          { subscription: true }
        ),
        subscription: {
          status: access.status,
          expiryDate: subscription?.expiryDate ?? null,
          daysUntilExpiry: access.daysUntilExpiry,
          isInGracePeriod: access.isInGracePeriod,
          isBlocked: access.isBlocked,
          source: subscription?.source ?? "paid",
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
