// lib/coupon-pricing.ts
//
// Vendor-coupon validation + application, called by computeOrderPricing
// (lib/pricing.ts) whenever a couponCode is provided — never called
// directly by routes, so cart display, razorpay/create-order,
// razorpay/verify-payment, and the COD app/api/orders route all validate
// and price a coupon identically, through the one server-authoritative path.
//
// Money model (confirmed with the user before implementing):
// - The VENDOR absorbs the full discount. platformCommission is computed
//   on the original pre-discount price and is never reduced — a vendor's
//   own coupon never costs the platform anything.
// - discountAmount is capped so a vendor's earnings on the order can never
//   go negative (floors at 0), regardless of how the vendor configured the
//   coupon's discountValue.
// - minOrderValue is checked against that vendor's subtotal within the
//   cart, not the whole multi-vendor cart total.
//
// Usage-limit tracking is deliberately NOT done here — this module only
// validates and previews. redeemCoupon() below is called explicitly by
// the two routes that actually commit an order (razorpay/verify-payment,
// app/api/orders), after Order.create() succeeds, so a cart-display or
// razorpay/create-order call (which run this same validation) never
// increments usage. Both of those commit routes already have their own
// idempotency guard (razorpayPaymentId / X-Idempotency-Key) that runs
// BEFORE order creation, so a retry never reaches redeemCoupon twice for
// the same order — no separate idempotency key needed here.

import { Coupon } from "@/lib/models/coupon";
import { Order } from "@/lib/models/order";
import { PricingError, type ProcessedItem, type VendorPayout, type AppliedCoupon } from "@/lib/pricing";
import { formatCurrency } from "@/lib/currency";

interface ApplyCouponInput {
  processedItems: ProcessedItem[];
  vendorPayouts: Record<string, VendorPayout>;
  totalAmount: number;
  couponCode: string;
  userId?: string;
}

interface ApplyCouponResult {
  processedItems: ProcessedItem[];
  vendorPayouts: Record<string, VendorPayout>;
  totalAmount: number;
  appliedCoupon: AppliedCoupon;
}

export async function validateAndApplyCoupon(
  input: ApplyCouponInput
): Promise<ApplyCouponResult> {
  const { processedItems, vendorPayouts, totalAmount, couponCode, userId } = input;

  const normalizedCode = couponCode.trim().toUpperCase();
  if (!normalizedCode) {
    throw new PricingError("Coupon code is required", 400);
  }

  // A code is only unique per-shop, not globally, so multiple coupons can
  // share the same code string across different vendors — disambiguate by
  // picking the one whose shop actually has items in this cart.
  const candidates = await Coupon.find({ code: normalizedCode, isActive: true }).lean();
  if (candidates.length === 0) {
    throw new PricingError("Invalid coupon code", 400);
  }

  const cartShopIds = new Set(processedItems.map((i) => i.shopId.toString()));
  const coupon = candidates.find((c: any) => cartShopIds.has(c.shopId.toString()));
  if (!coupon) {
    throw new PricingError("This coupon isn't valid for the items in your cart", 400);
  }

  const now = new Date();
  if (coupon.validFrom && now < new Date(coupon.validFrom)) {
    throw new PricingError("This coupon isn't active yet", 400);
  }
  if (coupon.validUntil && now > new Date(coupon.validUntil)) {
    throw new PricingError("This coupon has expired", 400);
  }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    throw new PricingError("This coupon has reached its usage limit", 400);
  }

  const shopIdStr = (coupon.shopId as any).toString();

  if (userId && coupon.perUserLimit != null) {
    const userUsageCount = await Order.countDocuments({
      user: userId,
      "appliedCoupon.code": normalizedCode,
      "appliedCoupon.shopId": coupon.shopId,
    });
    if (userUsageCount >= coupon.perUserLimit) {
      throw new PricingError("You've already used this coupon the maximum number of times", 400);
    }
  }

  const vendorItemIndexes = processedItems
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.shopId.toString() === shopIdStr);

  const vendorSubtotal = vendorItemIndexes.reduce(
    (sum, { item }) => sum + item.price * item.quantity,
    0
  );

  if (coupon.minOrderValue && vendorSubtotal < coupon.minOrderValue) {
    throw new PricingError(
      `Add ${formatCurrency(coupon.minOrderValue - vendorSubtotal)} more from this seller to use this coupon`,
      400
    );
  }

  let rawDiscount =
    coupon.discountType === "percentage"
      ? (vendorSubtotal * coupon.discountValue) / 100
      : coupon.discountValue;

  if (coupon.discountType === "percentage" && coupon.maxDiscountAmount) {
    rawDiscount = Math.min(rawDiscount, coupon.maxDiscountAmount);
  }

  // Vendor absorbs the discount — never let it exceed what this vendor is
  // actually earning on these items, so vendorEarnings can't go negative.
  const vendorEarningsSubtotal = vendorItemIndexes.reduce(
    (sum, { item }) => sum + item.vendorEarnings,
    0
  );
  const discountAmount = Math.max(
    0,
    Math.min(rawDiscount, vendorEarningsSubtotal, vendorSubtotal)
  );

  if (discountAmount <= 0) {
    throw new PricingError("This coupon doesn't apply any discount to your cart", 400);
  }

  // Distribute the discount across this vendor's items, proportional to
  // each item's share of vendorEarnings, so item-level and aggregate
  // totals stay reconciled. Remainder goes to the last item to avoid
  // rounding drift (paisa-level).
  const updatedItems = processedItems.map((item) => ({ ...item }));
  let allocated = 0;
  vendorItemIndexes.forEach(({ item, idx }, i) => {
    const isLast = i === vendorItemIndexes.length - 1;
    const share = isLast
      ? Math.round((discountAmount - allocated) * 100) / 100
      : Math.round((item.vendorEarnings / vendorEarningsSubtotal) * discountAmount * 100) / 100;
    allocated += share;
    updatedItems[idx] = {
      ...item,
      vendorEarnings: Math.max(0, item.vendorEarnings - share),
      discountAmount: share,
    };
  });

  // Rebuild this vendor's payout aggregate from the discounted items so
  // vendorPayouts[shopId].amount stays exactly equal to the sum of
  // items[].vendorEarnings for that shop — the same invariant the
  // undiscounted path already relies on.
  const vendorPayoutItems = vendorItemIndexes.map(({ idx }) => {
    const item = updatedItems[idx];
    return {
      productId: item.product,
      productName: item.name,
      quantity: item.quantity,
      price: item.price,
      earnings: item.vendorEarnings,
    };
  });
  const updatedVendorPayouts: Record<string, VendorPayout> = { ...vendorPayouts };
  updatedVendorPayouts[shopIdStr] = {
    shopId: vendorPayouts[shopIdStr].shopId,
    shopName: vendorPayouts[shopIdStr].shopName,
    amount: vendorPayoutItems.reduce((sum, it) => sum + it.earnings, 0),
    items: vendorPayoutItems,
  };

  return {
    processedItems: updatedItems,
    vendorPayouts: updatedVendorPayouts,
    totalAmount: Math.round((totalAmount - discountAmount) * 100) / 100,
    appliedCoupon: { code: normalizedCode, shopId: shopIdStr, discountAmount },
  };
}

/**
 * Atomically claims one use of a coupon. Call ONLY after an order has
 * actually been created (paymentStatus completed, or a COD order created)
 * — never at validation/preview time. Guarded the same way
 * lib/stock-reservation.ts guards stock: a conditional update that only
 * succeeds if usageCount is still under usageLimit, so concurrent
 * checkouts can't both succeed past a limit of 1.
 *
 * Best-effort by design (matches how ledger recording failures are
 * already handled in the two callers): if this loses the race in the rare
 * window between validation and commit, the order still stands — we log
 * and move on rather than rolling back a real order over an off-by-one
 * coupon count.
 */
export async function redeemCoupon(shopId: string, code: string): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  const result = await Coupon.findOneAndUpdate(
    {
      shopId,
      code: normalizedCode,
      $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }],
    },
    { $inc: { usageCount: 1 } }
  );
  if (!result) {
    console.error(
      `[Coupon] Failed to redeem ${normalizedCode} for shop ${shopId} — usage limit reached at commit time.`
    );
  }
}
