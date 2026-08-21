// lib/models/hero-product.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHeroProduct extends Document {
  productId: mongoose.Types.ObjectId;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HeroProductSchema = new Schema<IHeroProduct>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

HeroProductSchema.index({ isActive: 1, sortOrder: 1 });

export const HeroProduct: Model<IHeroProduct> =
  mongoose.models.HeroProduct || mongoose.model<IHeroProduct>("HeroProduct", HeroProductSchema);
