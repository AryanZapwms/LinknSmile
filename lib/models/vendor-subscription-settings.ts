// lib/models/vendor-subscription-settings.ts
import mongoose from "mongoose";
import { CURRENCY_CODE } from "@/lib/currency";

const vendorSubscriptionSettingsSchema = new mongoose.Schema(
  {
    annualFeeAmount: {
      type: Number,
      default: 4999, // admin-editable; the raw number is not currency-aware — out of scope for this pass, see PROJECT_SOURCE_OF_TRUTH.md
    },
    currency: {
      type: String,
      default: CURRENCY_CODE,
    },
  },
  { timestamps: true }
);

export const VendorSubscriptionSettings =
  mongoose.models.VendorSubscriptionSettings ||
  mongoose.model("VendorSubscriptionSettings", vendorSubscriptionSettingsSchema);
