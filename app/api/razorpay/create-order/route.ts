import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { computeOrderPricing, PricingError } from "@/lib/pricing";
import { CURRENCY_CODE } from "@/lib/currency";
import { razorpayAdapter } from "@/lib/payments/razorpay";
import { PaymentGatewayError } from "@/lib/payments/types";

// This route is now a thin, behavior-preserving wrapper around
// lib/payments/razorpay.ts (see PROJECT_SOURCE_OF_TRUTH.md §16 — "wrapper
// extraction, not a rewrite"). Response shape is unchanged: existing
// clients (app/checkout/page.tsx) still get { id, amount, currency,
// totalAmount }. Multi-gateway deployments should call
// /api/payments/create-order instead, which dispatches to whichever
// gateway PAYMENT_GATEWAY selects — this URL stays Razorpay-specific.
export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }));
    }

    const { items, couponCode } = await request.json();

    await connectDB();
    const { totalAmount } = await computeOrderPricing(items, {
      couponCode: couponCode || undefined,
      userId: session.user.id,
    });

    if (!totalAmount || totalAmount <= 0) {
      return withCORS(NextResponse.json({ error: "Invalid order total" }, { status: 400 }));
    }

    const razorpayOrder = await razorpayAdapter.createPaymentOrder({
      amount: totalAmount,
      currency: CURRENCY_CODE,
    });

    return withCORS(
      NextResponse.json({
        id: razorpayOrder.gatewayOrderId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        totalAmount, // rupees — for display only
      })
    );
  } catch (error) {
    if (error instanceof PricingError || error instanceof PaymentGatewayError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Razorpay create-order error:", error);
    return withCORS(NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 }));
  }
}
