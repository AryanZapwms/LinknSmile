// lib/models/user.ts
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      // Optional: Google OAuth users have no password.
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    role: {
      type: String,
      enum: ["user", "admin", "shop_owner"], // ✅ ADD "shop_owner"
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetOtpHash: { type: String },
    resetOtpExpires: { type: Date },

    // ✅ ADD THESE NEW FIELDS
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },
    pushTokens: { type: [String], default: [] },

    // Set when a user starts (but hasn't finished) the vendor application flow.
    pendingVendorApplication: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ ADD INDEX
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ email: 1, isVerified: 1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
