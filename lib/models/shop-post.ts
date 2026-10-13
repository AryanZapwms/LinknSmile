// lib/models/shop-post.ts
//
// A post on a shop's public page (app/shop/[slug]) — how a Services shop
// shows what it does. Groundwork only: the page reads published posts
// (lib/shop-page.ts), but no screen or route creates them yet.
import mongoose, { Schema, Document, Model } from "mongoose";
import {
  POST_MAX_IMAGES,
  POST_STATUSES,
  POST_TEXT_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  safeVideoUrl,
  type PostStatus,
} from "@/lib/shop-post-rules";

export interface IShopPost extends Document {
  shopId: mongoose.Types.ObjectId;
  title: string;
  text: string;
  images: string[];
  videoUrl?: string;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ShopPostSchema = new Schema<IShopPost>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    title: { type: String, required: true, trim: true, maxlength: POST_TITLE_MAX_LENGTH },
    text: { type: String, default: "", maxlength: POST_TEXT_MAX_LENGTH },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images: string[]) => images.length <= POST_MAX_IMAGES,
        message: `A post can have at most ${POST_MAX_IMAGES} images`,
      },
    },
    // A link to a video hosted elsewhere, not an upload.
    videoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (url: string) => !url || safeVideoUrl(url) !== null,
        message: "The video link must be an https:// address",
      },
    },
    status: { type: String, enum: [...POST_STATUSES], default: "draft" },
  },
  { timestamps: true }
);

// The shop page lists one shop's published posts, newest first.
ShopPostSchema.index({ shopId: 1, status: 1, createdAt: -1 });

export const ShopPost: Model<IShopPost> =
  mongoose.models.ShopPost || mongoose.model<IShopPost>("ShopPost", ShopPostSchema);
