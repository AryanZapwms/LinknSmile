// lib/models/subscription-checkout.ts
//
// Server-side record of a vendor subscription renewal order, written by
// app/api/vendor/subscription/create-order. The subscription counterpart of
// lib/models/razorpay-checkout.ts: it tells the Razorpay webhook which shop
// a payment renews (so a vendor who pays and closes the tab still gets
// renewed), and it is the idempotency lock shared by the browser verify and
// the webhook (lib/subscription-checkout-fulfillment.ts): created →
// processing is an atomic claim and razorpayPaymentId is unique.

import mongoose from "mongoose";

const subscriptionCheckoutSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Admin-configured fee at create-order time, in major units and in the
    // gateway's minor units exactly as sent to Razorpay.
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
    lastPaymentId: { type: String, index: true },
    rejectionReason: { type: String },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorSubscription" },
    subscriptionExpiryDate: { type: Date },
    // Only unpaid checkouts expire (cleared at the first claim), as in razorpay-checkout.
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

subscriptionCheckoutSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SUBSCRIPTION_CHECKOUT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SubscriptionCheckout =
  mongoose.models.SubscriptionCheckout ||
  mongoose.model("SubscriptionCheckout", subscriptionCheckoutSchema);
