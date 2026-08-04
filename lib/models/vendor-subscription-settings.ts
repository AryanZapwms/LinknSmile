// lib/models/vendor-subscription-settings.ts
import mongoose from "mongoose";

const vendorSubscriptionSettingsSchema = new mongoose.Schema(
  {
    annualFeeAmount: {
      type: Number,
      default: 4999, // INR, admin-editable
    },
    currency: {
      type: String,
      default: "INR",
    },
  },
  { timestamps: true }
);

export const VendorSubscriptionSettings =
  mongoose.models.VendorSubscriptionSettings ||
  mongoose.model("VendorSubscriptionSettings", vendorSubscriptionSettingsSchema);
