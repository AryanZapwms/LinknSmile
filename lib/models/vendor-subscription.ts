// lib/models/vendor-subscription.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { CURRENCY_CODE } from "@/lib/currency";

export interface IPaymentHistoryEntry {
  amount: number;
  // Frozen, Razorpay-only — see the schema-level comment below for why
  // these are no longer required and never renamed.
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  // Gateway-agnostic equivalents, added 2026-08-19 for Tap (and any future
  // gateway).
  paymentGateway?: "razorpay" | "tap";
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  paidAt: Date;
  status: "success" | "failed";
}

export interface IVendorSubscription extends Document {
  shopId: mongoose.Types.ObjectId;
  status: "active" | "expired" | "cancelled" | "pending";
  amount: number;
  currency: string;
  startDate?: Date;
  expiryDate?: Date;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentGateway?: "razorpay" | "tap";
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  paymentHistory: IPaymentHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const PaymentHistorySchema = new Schema<IPaymentHistoryEntry>(
  {
    amount: { type: Number, required: true },
    // Frozen, Razorpay-only — no longer `required` (was required: true)
    // since Tap entries don't populate it. Never renamed/reused: existing
    // India payment-history entries already have this populated, and this
    // is a separate-database-per-country architecture, so renaming would
    // mean migrating live production data for zero benefit (see
    // PROJECT_SOURCE_OF_TRUTH.md §16).
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    // Gateway-agnostic equivalents, added 2026-08-19 for Tap (and any
    // future gateway) — mirrors the lib/models/dispute.ts
    // paymentReferenceId precedent.
    paymentGateway: { type: String, enum: ["razorpay", "tap"] },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    paidAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["success", "failed"], required: true },
  },
  { _id: false }
);

const VendorSubscriptionSchema = new Schema<IVendorSubscription>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: "pending",
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: CURRENCY_CODE },
    startDate: { type: Date },
    expiryDate: { type: Date },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paymentGateway: { type: String, enum: ["razorpay", "tap"] },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancellationReason: { type: String },
    paymentHistory: { type: [PaymentHistorySchema], default: [] },
  },
  { timestamps: true }
);

VendorSubscriptionSchema.index({ status: 1, expiryDate: 1 });

export const VendorSubscription: Model<IVendorSubscription> =
  mongoose.models.VendorSubscription ||
  mongoose.model<IVendorSubscription>("VendorSubscription", VendorSubscriptionSchema);
