// lib/models/product.ts
import mongoose from "mongoose";
import "@/lib/models/shop";
import "@/lib/models/category";
import "@/lib/models/company";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true },
    description: String,
    price: { type: Number, required: true },
    discountPrice: Number,
    image: String,
    images: [String],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    // ── NEW: product origin ──────────────────────────────
    origin: {
      type: String,
      enum: ["made-in-india", "foreign-made", "unspecified"],
      default: "unspecified",
    },
    // ────────────────────────────────────────────────────
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      default: () => new mongoose.Types.ObjectId("699942a5a2b407e83b6d9ea8"),
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    rejectionReason: String,
    submittedAt: { type: Date, default: Date.now },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    stock: { type: Number, default: 0 },
    sku: String,
    ingredients: [String],
    benefits: [String],
    usage: String,
    suitableFor: [String],
    results: [{ image: String, title: String, text: String }],
    sizes: [
      {
        size: String,
        unit: { type: String, enum: ["ml", "l", "g", "kg"], default: "ml" },
        quantity: Number,
        price: Number,
        discountPrice: Number,
        stock: { type: Number, default: 0 },
        sku: String,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ isActive: 1, category: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ shopId: 1, approvalStatus: 1 });
productSchema.index({ approvalStatus: 1 });
// New index for origin filtering
productSchema.index({ origin: 1, isActive: 1 });

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
