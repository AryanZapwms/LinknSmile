// app/api/pricing/quote/route.ts
// Price preview for a cart: the exact computeOrderPricing() the checkout
// routes charge with, so what the app shows is what the customer pays.
// Never creates an order or redeems a coupon. There is no shipping line
// because the server charges none.
//
// Auth is optional (guest carts), except that a coupon needs a signed-in
// user so its per-user limit can be checked — as in /api/coupons/validate.

import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { computeOrderPricing, PricingError } from "@/lib/pricing";
import { CURRENCY_CODE } from "@/lib/currency";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiError, clientIp } from "@/lib/api-error";
import { rateLimit } from "@/lib/rate-limit";
import { quoteRequest } from "@/lib/contracts/pricing";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  if (!rateLimit("pricing-quote", clientIp(request), { limit: 60, windowMs: 60_000 }).success) {
    return apiError("RATE_LIMITED", "Too many requests. Please slow down.", 429, {}, { "Retry-After": "60" });
  }

  const parsed = quoteRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid quote request", 400, {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const { items, couponCode } = parsed.data;

  const user = await getAuthUser(request);
  if (couponCode && !user) {
    return apiError("UNAUTHORIZED", "Please log in to apply a coupon.", 401);
  }

  try {
    await connectDB();
    const pricing = await computeOrderPricing(items, { couponCode, userId: user?.id });
    const subtotal = round2(pricing.processedItems.reduce((s, i) => s + i.price * i.quantity, 0));
    return withCORS(
      NextResponse.json({
        success: true,
        currency: CURRENCY_CODE,
        items: pricing.processedItems.map((i) => ({
          product: String(i.product),
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          lineTotal: round2(i.price * i.quantity),
          selectedSize: i.selectedSize ?? null,
          shopId: String(i.shopId),
          shopName: i.shopName,
        })),
        subtotal,
        discountAmount: pricing.appliedCoupon?.discountAmount ?? 0,
        coupon: pricing.appliedCoupon
          ? { code: pricing.appliedCoupon.code, shopId: String(pricing.appliedCoupon.shopId), discountAmount: pricing.appliedCoupon.discountAmount }
          : null,
        taxRatePercent: pricing.taxRatePercent,
        taxAmount: pricing.taxAmount,
        shippingAmount: 0,
        totalAmount: pricing.totalAmount,
      })
    );
  } catch (error) {
    if (error instanceof PricingError) {
      return apiError("PRICING_ERROR", error.message, error.status);
    }
    console.error("Pricing quote error:", error);
    return apiError("INTERNAL_ERROR", "Could not price the cart. Please retry.", 500);
  }
}
