import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    enableCOD: {
      type: Boolean,
      default: true,
    },
    enableRazorpay: {
      type: Boolean,
      default: true,
    },
    minCODAmount: {
      type: Number,
      default: 0, // Minimum order amount for COD
    },
    maxCODAmount: {
      type: Number,
      default: 100000, // Maximum order amount for COD
    },
  },
  { timestamps: true }
);

export const PaymentSettings =
  mongoose.models.PaymentSettings ||
  mongoose.model("PaymentSettings", paymentSettingsSchema);
