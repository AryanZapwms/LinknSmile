// app/api/coupons/validate/route.ts
//
// Validate-only preview: lets the checkout UI show a discount before
// payment. Runs through the exact same computeOrderPricing() +
// lib/coupon-pricing.ts path as create-order/verify-payment/orders, so
// the preview can never diverge from what the server will actually
// charge — but this route itself never creates an order and never
// increments coupon usage (see lib/coupon-pricing.ts redeemCoupon()).
import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { computeOrderPricing, PricingError } from "@/lib/pricing";

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
    if (!couponCode || typeof couponCode !== "string") {
      return withCORS(NextResponse.json({ error: "Coupon code is required" }, { status: 400 }));
    }

    await connectDB();
    const { totalAmount, appliedCoupon, taxRatePercent, taxAmount } = await computeOrderPricing(items, {
      couponCode,
      userId: session.user.id,
    });

    if (!appliedCoupon) {
      // computeOrderPricing only returns without appliedCoupon if no code
      // was passed at all — shouldn't be reachable given the check above,
      // but fail closed rather than claim a discount that isn't there.
      return withCORS(NextResponse.json({ error: "Invalid coupon code" }, { status: 400 }));
    }

    return withCORS(
      NextResponse.json({
        success: true,
        discountAmount: appliedCoupon.discountAmount,
        totalAmount,
        taxRatePercent,
        taxAmount,
        code: appliedCoupon.code,
      })
    );
  } catch (error) {
    if (error instanceof PricingError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Coupon validate error:", error);
    return withCORS(NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 }));
  }
}
