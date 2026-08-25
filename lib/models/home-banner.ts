// lib/models/home-banner.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHomeBanner extends Document {
  imageUrl: string;
  title?: string;
  description?: string;
  linkType: "product" | "shop" | "url" | "none";
  linkValue?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HomeBannerSchema = new Schema<IHomeBanner>(
  {
    imageUrl: { type: String, required: true },
    title: { type: String },
    description: { type: String },
    linkType: {
      type: String,
      enum: ["product", "shop", "url", "none"],
      default: "none",
    },
    linkValue: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

HomeBannerSchema.index({ isActive: 1, sortOrder: 1 });

export const HomeBanner: Model<IHomeBanner> =
  mongoose.models.HomeBanner || mongoose.model<IHomeBanner>("HomeBanner", HomeBannerSchema);
