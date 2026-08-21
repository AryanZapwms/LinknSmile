import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { VendorSubscriptionSettings } from "@/lib/models/vendor-subscription-settings";
import { CURRENCY_CODE } from "@/lib/currency";
import { razorpayAdapter } from "@/lib/payments/razorpay";

// Thin, behavior-preserving wrapper around lib/payments/razorpay.ts — see
// app/api/razorpay/create-order for the same pattern. Response shape
// unchanged: { id, amount, currency, annualFeeAmount }. Multi-gateway
// deployments should call /api/vendor/subscription/tap/create-order
// instead — this URL stays Razorpay-specific.
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

    // Fee amount is server-side/admin-configured — never trust a client-sent amount.
    let settings = await VendorSubscriptionSettings.findOne();
    if (!settings) {
      settings = await VendorSubscriptionSettings.create({});
    }
    const amount = settings.annualFeeAmount;
    const currency = settings.currency || CURRENCY_CODE;

    const razorpayOrder = await razorpayAdapter.createPaymentOrder({ amount, currency });

    // Track the pending attempt so the admin table can see "payment initiated".
    // verify-payment remains the source of truth for actually activating access.
    await VendorSubscription.findOneAndUpdate(
      { shopId },
      {
        $setOnInsert: { shopId, paymentHistory: [] },
        $set: {
          status: "pending",
          amount,
          currency,
          razorpayOrderId: razorpayOrder.gatewayOrderId,
        },
      },
      { upsert: true, new: true }
    );

    return withCORS(
      NextResponse.json({
        id: razorpayOrder.gatewayOrderId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        annualFeeAmount: amount, // rupees — for display only
      })
    );
  } catch (error) {
    console.error("Vendor subscription create-order error:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to create subscription order" }, { status: 500 })
    );
  }
}
