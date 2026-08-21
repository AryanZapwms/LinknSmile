import { withCORS } from "@/lib/cors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { type NextRequest, NextResponse } from "next/server";
import { paymentLimiter } from "@/lib/rate-limit";
import { razorpayAdapter } from "@/lib/payments/razorpay";
import { PaymentGatewayError } from "@/lib/payments/types";
import { fulfillSubscriptionPayment } from "@/lib/subscription-fulfillment";

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

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ error: "No shop found for this account." }, { status: 404 }));
    }

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
