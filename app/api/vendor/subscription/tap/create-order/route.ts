import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { VendorSubscriptionSettings } from "@/lib/models/vendor-subscription-settings";
import { CURRENCY_CODE } from "@/lib/currency";
import { tapAdapter } from "@/lib/payments/tap";
import { PaymentGatewayError } from "@/lib/payments/types";

// Tap equivalent of app/api/vendor/subscription/create-order. Same
// redirect-survival reasoning as app/api/tap/create-order: shopId is
// stashed in the charge's metadata since the browser fully navigates away
// to Tap's hosted page and back.
export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }));
    }

    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ error: "No shop found for this account." }, { status: 404 }));
    }

    await connectDB();

    let settings = await VendorSubscriptionSettings.findOne();
    if (!settings) {
      settings = await VendorSubscriptionSettings.create({});
    }
    const amount = settings.annualFeeAmount;
    const currency = settings.currency || CURRENCY_CODE;

    const charge = await tapAdapter.createPaymentOrder({
      amount,
      currency,
      reference: `subscription-${shopId}-${Date.now()}`,
      metadata: { shopId },
      // Distinct from the order-checkout return/webhook paths — see
      // lib/payments/tap.ts's CreatePaymentOrderParams for why this can't
      // be a single hardcoded constant shared between the two flows.
      redirectPath: "/vendor-tap-return",
      webhookPath: "/api/vendor/subscription/tap/webhook",
    });

    await VendorSubscription.findOneAndUpdate(
      { shopId },
      {
        $setOnInsert: { shopId, paymentHistory: [] },
        $set: {
          status: "pending",
          amount,
          currency,
          gatewayOrderId: charge.gatewayOrderId,
        },
      },
      { upsert: true, new: true }
    );

    return withCORS(
      NextResponse.json({
        id: charge.gatewayOrderId,
        redirectUrl: charge.redirectUrl,
        annualFeeAmount: amount,
      })
    );
  } catch (error) {
    if (error instanceof PaymentGatewayError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Tap vendor subscription create-order error:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to create subscription order" }, { status: 500 })
    );
  }
}
