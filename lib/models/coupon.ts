// lib/models/coupon.ts
import mongoose from "mongoose";
import "@/lib/models/shop";

const couponSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: Number,
    usageLimit: Number,
    // Internal counter, incremented only when an order actually completes.
    // Not vendor-editable directly — see lib/coupon-pricing.ts.
    usageCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: Number,
    validFrom: Date,
    validUntil: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Same code string can exist for different shops (e.g. two vendors both
// running "SAVE20") — uniqueness is scoped per shop, not global.
couponSchema.index({ shopId: 1, code: 1 }, { unique: true });
couponSchema.index({ code: 1, isActive: 1 });

export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
