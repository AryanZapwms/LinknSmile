// lib/models/order.ts
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
        selectedSize: {
          size: String,
          unit: { type: String, enum: ["ml", "l", "g", "kg"] },
          quantity: Number,
          price: Number,
          discountPrice: Number,
        },
        shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
        shopName: String,
        platformCommission: { type: Number, default: 0 },
        vendorEarnings: { type: Number, default: 0 },
        commissionRate: { type: Number, default: 10 },
        // This item's share of a vendor coupon's discount, if any (see
        // appliedCoupon below). Already subtracted from vendorEarnings —
        // the vendor absorbs it, platformCommission is unaffected.
        discountAmount: { type: Number, default: 0 },
      },
    ],
    // Final chargeable amount: item subtotal, minus any coupon discount,
    // plus tax (see taxRatePercent/taxAmount below).
    totalAmount: { type: Number, required: true },
    // Snapshot of the tax rate/amount actually charged at order time —
    // never recomputed retroactively if PlatformSettings.taxRatePercent
    // later changes, same reasoning as why razorpayOrderId/currency-at-order-
    // time fields elsewhere in this schema are frozen, not live references.
    // Both default to 0 (India today has no tax) — always present, unlike
    // appliedCoupon which is genuinely absent when unused.
    taxRatePercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    // Set only when a vendor coupon was applied at checkout. discountAmount
    // is the total discount (sum of items[].discountAmount for this shop),
    // already reflected in totalAmount and in the affected items' earnings.
    appliedCoupon: {
      code: String,
      shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
      discountAmount: Number,
    },
    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      zipCode: String,
      country: String,
    },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    paymentMethod: { type: String, enum: ["cod", "razorpay", "tap"], default: "razorpay" },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    cancellationReason: { type: String, default: null },
    // Frozen, Razorpay-only — never renamed, never reused by any other
    // gateway. Existing India documents already have these populated, and
    // this is a separate-database-per-country architecture, so renaming
    // would mean migrating live production data for zero benefit (see
    // PROJECT_SOURCE_OF_TRUTH.md §16 for the full tradeoff discussion).
    razorpayOrderId: String,
    razorpayPaymentId: String,
    // Gateway-agnostic equivalents, added 2026-08-19 for Tap (and any
    // future gateway) — mirrors the lib/models/dispute.ts
    // paymentReferenceId precedent. Razorpay orders do NOT populate these;
    // only gateways added after this point do.
    paymentGateway: { type: String, enum: ["razorpay", "tap"] },
    gatewayOrderId: String,
    gatewayPaymentId: String,
    idempotencyKey: { type: String, sparse: true, unique: true },
    vendorPayouts: [
      {
        shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
        amount: Number,
        status: { type: String, enum: ["pending", "released", "held"], default: "pending" },
        deliveredAt: Date,
        releasedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ "items.shopId": 1 });
orderSchema.index({ "vendorPayouts.shopId": 1, "vendorPayouts.status": 1 });
orderSchema.index({ orderStatus: 1, "vendorPayouts.status": 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
orderSchema.index({ gatewayPaymentId: 1 }, { sparse: true });
orderSchema.index({ user: 1, "appliedCoupon.code": 1, "appliedCoupon.shopId": 1 }, { sparse: true });

// ✅ FIXED: pre-save hook without `next` (async function)
orderSchema.pre("save", function () {
  if (!this.isNew) return;

  const shopTotals = new Map<string, { shopId: mongoose.Types.ObjectId; amount: number }>();

  for (const item of this.items as any[]) {
    if (!item.shopId) continue;
    const key = item.shopId.toString();
    const current = shopTotals.get(key);
    const earnings = item.vendorEarnings || 0;
    if (current) {
      current.amount += earnings;
    } else {
      shopTotals.set(key, { shopId: item.shopId, amount: earnings });
    }
  }

  const existingShopIds = new Set(
    (this.vendorPayouts as any[]).map((p: any) => p.shopId?.toString())
  );

  for (const [key, { shopId, amount }] of shopTotals) {
    if (!existingShopIds.has(key)) {
      (this.vendorPayouts as any[]).push({
        shopId,
        amount,
        status: "pending",
      });
    }
  }
});

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
