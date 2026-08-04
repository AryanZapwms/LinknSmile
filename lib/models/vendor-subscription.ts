// lib/models/vendor-subscription.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentHistoryEntry {
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
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
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
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
    currency: { type: String, default: "INR" },
    startDate: { type: Date },
    expiryDate: { type: Date },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
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
