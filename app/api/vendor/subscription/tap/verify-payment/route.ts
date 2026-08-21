import { withCORS } from "@/lib/cors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { type NextRequest, NextResponse } from "next/server";
import { paymentLimiter } from "@/lib/rate-limit";
import { tapAdapter } from "@/lib/payments/tap";
import { PaymentGatewayError } from "@/lib/payments/types";
import { fulfillSubscriptionPayment } from "@/lib/subscription-fulfillment";

// Called from app/checkout/tap-return/page.tsx (shared with the order
// checkout return — see that page for how it tells the two cases apart)
// once the vendor's browser comes back from Tap's hosted renewal page.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = paymentLimiter(ip);
  if (!success) {
    return Response.json(
      { error: "Too many requests. Please wait a minute before trying again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { tapId } = await request.json();
    if (!tapId) {
      return withCORS(NextResponse.json({ error: "Missing Tap charge ID" }, { status: 400 }));
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const result = await tapAdapter.verifyPayment({ chargeId: tapId });
    const metadata = result.metadata || {};

    if (metadata.shopId && metadata.shopId !== session.user.shopId) {
      return withCORS(NextResponse.json({ error: "This charge does not belong to your shop" }, { status: 403 }));
    }
    if (!result.success) {
      return withCORS(NextResponse.json({ error: "Payment was not completed" }, { status: 400 }));
    }

    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ error: "No shop found for this account." }, { status: 404 }));
    }

    let fulfillResult;
    try {
      fulfillResult = await fulfillSubscriptionPayment({
        shopId,
        gateway: {
          paymentMethod: "tap",
          gatewayOrderId: result.gatewayOrderId,
          gatewayPaymentId: result.gatewayPaymentId,
        },
      });
    } catch (e: any) {
      return withCORS(NextResponse.json({ error: e.message }, { status: 400 }));
    }

    return withCORS(
      NextResponse.json({
        success: true,
        subscriptionId: fulfillResult.subscriptionId,
        expiryDate: fulfillResult.expiryDate,
      })
    );
  } catch (error) {
    if (error instanceof PaymentGatewayError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Tap vendor subscription verify-payment error:", error);
    return withCORS(NextResponse.json({ error: "Payment verification failed" }, { status: 500 }));
  }
}
