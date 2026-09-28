// lib/models/razorpay-checkout.ts
//
// Server-side record of what a Razorpay order was created FOR. Written by
// app/api/razorpay/create-order (after pricing the cart server-side) and
// consumed by app/api/razorpay/verify-payment, which fulfils the order from
// these stored items/coupon/total instead of trusting the request body —
// the same idea as Tap's charge metadata (see app/api/tap/create-order).
// app/api/razorpay/webhook fulfils from it too.
//
// Also the idempotency lock shared by verify-payment and the webhook (see
// lib/razorpay-fulfillment.ts): the created → processing transition is an
// atomic claim, and razorpayPaymentId is unique, so a replayed or
// concurrent call can never create a second Order.

import mongoose from "mongoose";

const razorpayCheckoutSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [
      {
        _id: false,
        product: { type: String, required: true },
        quantity: { type: Number, required: true },
        selectedSize: {
          type: { _id: false, size: String, quantity: Number },
          default: undefined,
        },
      },
    ],
    couponCode: { type: String },
    // Stored at create-order so the webhook (which has no browser request)
    // can fulfil the order. Only the fields fulfillPaidOrder uses.
    shippingAddress: {
      type: {
        _id: false,
        name: String,
        phone: String,
        email: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      default: undefined,
    },
    // Server-computed total in major units (e.g. rupees) and in the
    // gateway's minor units (paise) exactly as sent to Razorpay.
    amount: { type: Number, required: true },
    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ["created", "processing", "fulfilled", "rejected"],
      default: "created",
      index: true,
    },
    processingAt: { type: Date },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    // Last payment id ever seen for this checkout. Unlike razorpayPaymentId
    // it is NOT cleared when a claim is released, so a captured-but-not-yet-
    // fulfilled payment always leaves a trace for refunds/audit.
    lastPaymentId: { type: String, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    rejectionReason: { type: String },
    // Cleanup of abandoned checkouts (see TTL index below). Set only at
    // creation; cleared the moment any payment is seen (first claim), so
    // only checkouts that never received a payment can ever expire.
    // processing / fulfilled / rejected records are kept indefinitely.
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// TTL: MongoDB deletes a document once expiresAt passes. Documents without
// expiresAt (anything that ever saw a payment) are never deleted.
razorpayCheckoutSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** How long an unpaid checkout is kept before the TTL index removes it. */
export const RAZORPAY_CHECKOUT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const RazorpayCheckout =
  mongoose.models.RazorpayCheckout || mongoose.model("RazorpayCheckout", razorpayCheckoutSchema);
