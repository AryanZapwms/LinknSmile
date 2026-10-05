import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import { paymentLimiter } from "@/lib/rate-limit";
import { razorpayAdapter } from "@/lib/payments/razorpay";
import { PaymentGatewayError } from "@/lib/payments/types";
import { fulfillSubscriptionPayment } from "@/lib/subscription-fulfillment";
import { getAuthSession } from "@/lib/get-auth-user";
import { blockMobileSubscriptionPayment } from "@/lib/subscription-mobile";
import {
  fulfilSubscriptionCheckout,
  type SubscriptionFulfilmentResult,
} from "@/lib/subscription-checkout-fulfillment";

const CHECKOUT_ERRORS: Record<
  Exclude<SubscriptionFulfilmentResult["kind"], "fulfilled" | "unknown_order">,
  [string, number]
> = {
  shop_mismatch: ["This payment does not belong to your shop", 403],
  previously_rejected: ["This payment could not be accepted. Please contact support.", 400],
  second_payment: ["This renewal has already been paid. Please contact support.", 409],
  payment_id_reused: ["Payment already used", 409],
  in_progress: ["This payment is already being processed", 409],
  lookup_failed: ["Could not confirm payment. Please retry in a moment.", 502],
  not_captured: ["Payment not confirmed yet. Please retry in a moment or contact support.", 409],
  order_id_mismatch: ["Payment verification failed", 400],
  amount_mismatch: ["Payment amount mismatch", 400],
};

// Thin, behavior-preserving wrapper: signature check via
// lib/payments/razorpay.ts, activation logic via
// lib/subscription-fulfillment.ts. Response shape and every side effect
// are unchanged. Multi-gateway deployments should call
// /api/vendor/subscription/tap/verify-payment instead — this URL stays
// Razorpay-specific.
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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return withCORS(NextResponse.json({ error: "Missing payment details" }, { status: 400 }));
    }

    await razorpayAdapter.verifyPayment({
      gatewayOrderId: razorpayOrderId,
      gatewayPaymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    const session = await getAuthSession(request);
    if (!session?.user?.id || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const mobileBlocked = await blockMobileSubscriptionPayment(session.user);
    if (mobileBlocked) return mobileBlocked;

    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ error: "No shop found for this account." }, { status: 404 }));
    }

    // Orders from create-order have a SubscriptionCheckout record: fulfil
    // through it (shared with the webhook, amount checked with Razorpay).
    const checkoutResult = await fulfilSubscriptionCheckout({
      razorpayOrderId,
      razorpayPaymentId,
      source: "verify",
      expectedShopId: shopId,
    });
    if (checkoutResult.kind === "fulfilled") {
      return withCORS(
        NextResponse.json({
          success: true,
          subscriptionId: checkoutResult.subscriptionId,
          expiryDate: checkoutResult.expiryDate,
        })
      );
    }
    if (checkoutResult.kind !== "unknown_order") {
      const [error, status] = CHECKOUT_ERRORS[checkoutResult.kind];
      return withCORS(NextResponse.json({ error }, { status }));
    }

    // Orders created before SubscriptionCheckout existed: previous behaviour.
    let result;
    try {
      result = await fulfillSubscriptionPayment({
        shopId,
        gateway: {
          paymentMethod: "razorpay",
          gatewayOrderId: razorpayOrderId,
          gatewayPaymentId: razorpayPaymentId,
        },
      });
    } catch (e: any) {
      return withCORS(NextResponse.json({ error: e.message }, { status: 400 }));
    }

    return withCORS(
      NextResponse.json({
        success: true,
        subscriptionId: result.subscriptionId,
        expiryDate: result.expiryDate,
      })
    );
  } catch (error) {
    if (error instanceof PaymentGatewayError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Vendor subscription verify-payment error:", error);
    return withCORS(
      NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
    );
  }
}
