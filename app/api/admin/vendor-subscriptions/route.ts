import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { getSubscriptionAccessState } from "@/lib/vendor-subscription-status";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const shops = await Shop.find()
      .select("shopName ownerId")
      .populate("ownerId", "name email")
      .lean();
    const subscriptions = await VendorSubscription.find().lean();
    const subsByShopId = new Map(subscriptions.map((s) => [s.shopId.toString(), s]));

    const rows = shops.map((shop: any) => {
      const sub = subsByShopId.get(shop._id.toString()) || null;
      const access = getSubscriptionAccessState(sub);
      const lastPayment = sub?.paymentHistory?.[sub.paymentHistory.length - 1] || null;

      return {
        shopId: shop._id,
        shopName: shop.shopName,
        owner: shop.ownerId,
        subscriptionStatus: sub?.status || "no_subscription",
        accessStatus: access.status,
        source: sub?.source || "paid",
        expiryDate: sub?.expiryDate || null,
        daysUntilExpiry: access.daysUntilExpiry,
        isInGracePeriod: access.isInGracePeriod,
        isBlocked: access.isBlocked,
        lastPaymentAmount: lastPayment?.amount ?? null,
        lastPaymentAt: lastPayment?.paidAt ?? null,
      };
    });

    return withCORS(NextResponse.json(rows));
  } catch (error) {
    console.error("Error listing vendor subscriptions:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to fetch vendor subscriptions" }, { status: 500 })
    );
  }
}
