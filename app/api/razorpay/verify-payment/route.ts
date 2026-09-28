import { withCORS } from "@/lib/cors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { type NextRequest, NextResponse } from "next/server";
import { paymentLimiter } from "@/lib/rate-limit";
import { razorpayAdapter } from "@/lib/payments/razorpay";
import { PaymentGatewayError } from "@/lib/payments/types";
import { PricingError } from "@/lib/order-fulfillment";
import { fulfilRazorpayCheckout, type RazorpayFulfilmentResult } from "@/lib/razorpay-fulfillment";

// Browser callback after the Razorpay widget succeeds. Checks the checkout
// signature and the session, then hands off to fulfilRazorpayCheckout(),
// which is shared with app/api/razorpay/webhook — whichever arrives first
// creates the order, the other gets the same orderId back.
//
// `items`, `couponCode` and `totalAmount` may still be sent by older
// clients but are deliberately ignored: the order is built from the
// RazorpayCheckout record create-order stored.

const RESPONSES: Record<Exclude<RazorpayFulfilmentResult["kind"], "fulfilled">, [string, number]> = {
  unknown_order: ["Unknown payment order", 400],
  user_mismatch: ["This payment does not belong to you", 403],
  previously_rejected: ["This payment could not be accepted. Please contact support.", 400],
  second_payment: ["This order has already been paid. Please contact support.", 409],
  payment_id_reused: ["Payment already used", 409],
  in_progress: ["This payment is already being processed", 409],
  lookup_failed: ["Could not confirm payment. Please retry in a moment.", 502],
  not_captured: ["Payment not confirmed yet. Please retry in a moment or contact support.", 409],
  order_id_mismatch: ["Payment verification failed", 400],
  amount_mismatch: ["Payment amount mismatch", 400],
  missing_address: ["Shipping address is required", 400],
  refund_required: [
    "Your cart changed after payment, so the order could not be placed. Your payment will be refunded — please contact support.",
    409,
  ],
};

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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, shippingAddress } =
      await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return withCORS(NextResponse.json({ error: "Missing payment details" }, { status: 400 }));
    }

    await razorpayAdapter.verifyPayment({
      gatewayOrderId: razorpayOrderId,
      gatewayPaymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const result = await fulfilRazorpayCheckout({
      razorpayOrderId,
      razorpayPaymentId,
      source: "verify",
      expectedUserId: session.user.id,
      shippingAddress,
    });

    if (result.kind === "fulfilled") {
      return withCORS(NextResponse.json({ success: true, orderId: result.orderId }));
    }
    const [error, status] = RESPONSES[result.kind];
    return withCORS(NextResponse.json({ error }, { status }));
  } catch (error) {
    if (error instanceof PricingError || error instanceof PaymentGatewayError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Payment verification error:", error);
    return withCORS(NextResponse.json({ error: "Payment verification failed" }, { status: 500 }));
  }
}
