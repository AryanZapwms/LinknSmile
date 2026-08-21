import { withCORS } from "@/lib/cors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { type NextRequest, NextResponse } from "next/server";
import { paymentLimiter } from "@/lib/rate-limit";
import { razorpayAdapter } from "@/lib/payments/razorpay";
import { PaymentGatewayError } from "@/lib/payments/types";
import { fulfillPaidOrder, PricingError } from "@/lib/order-fulfillment";

// This route is now a thin, behavior-preserving wrapper: signature check
// via lib/payments/razorpay.ts, all post-payment orchestration (pricing
// recompute, Order.create, coupon/stock/ledger/email) via
// lib/order-fulfillment.ts — a wrapper extraction, not a rewrite (see
// PROJECT_SOURCE_OF_TRUTH.md §16). Response shape, idempotency behavior,
// and every side effect are unchanged. Multi-gateway deployments should
// call /api/payments/verify-payment instead — this URL stays
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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, items, shippingAddress, couponCode } =
      await request.json();

    // Same check order as before this file was refactored: missing payment
    // details, then items, then shippingAddress, then signature.
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return withCORS(NextResponse.json({ error: "Missing payment details" }, { status: 400 }));
    }
    if (!Array.isArray(items) || items.length === 0) {
      return withCORS(NextResponse.json({ error: "No items in order" }, { status: 400 }));
    }
    if (!shippingAddress) {
      return withCORS(NextResponse.json({ error: "Shipping address is required" }, { status: 400 }));
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

    const { orderId } = await fulfillPaidOrder({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      items,
      shippingAddress,
      couponCode,
      gateway: {
        paymentMethod: "razorpay",
        gatewayOrderId: razorpayOrderId,
        gatewayPaymentId: razorpayPaymentId,
      },
    });

    return withCORS(NextResponse.json({ success: true, orderId }));
  } catch (error) {
    if (error instanceof PricingError || error instanceof PaymentGatewayError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Payment verification error:", error);
    return withCORS(NextResponse.json({ error: "Payment verification failed" }, { status: 500 }));
  }
}
