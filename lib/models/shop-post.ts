// lib/models/shop-post.ts
//
// A post on a shop's public page (app/shop/[slug]) — how a Services shop
// shows what it does. A vendor writes posts on /vendor/posts
// (app/api/vendor/posts, lib/shop-posts.ts); the public page reads the
// published ones (lib/shop-page.ts).
import mongoose, { Schema, Document, Model } from "mongoose";
import {
  POST_MAX_IMAGES,
  POST_MODERATION_ACTIONS,
  POST_MODERATION_REASON_MAX_LENGTH,
  POST_STATUSES,
  POST_TEXT_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  safeVideoUrl,
  type PostModerationAction,
  type PostStatus,
} from "@/lib/shop-post-rules";

export interface IShopPostModeration {
  action: PostModerationAction;
  reason: string;
  at: Date;
}

export interface IShopPost extends Document {
  shopId: mongoose.Types.ObjectId;
  title: string;
  text: string;
  images: string[];
  videoUrl?: string;
  status: PostStatus;
  moderation?: IShopPostModeration;
  hiddenBySubscription: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ModerationSchema = new Schema<IShopPostModeration>(
  {
    action: { type: String, enum: [...POST_MODERATION_ACTIONS], required: true },
    reason: { type: String, required: true, maxlength: POST_MODERATION_REASON_MAX_LENGTH },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const ShopPostSchema = new Schema<IShopPost>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    title: { type: String, required: true, trim: true, maxlength: POST_TITLE_MAX_LENGTH },
    text: { type: String, default: "", maxlength: POST_TEXT_MAX_LENGTH },
    // URLs our own storage returned (lib/shop-posts.ts addShopPostImage). A
    // client never supplies one.
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images: string[]) => images.length <= POST_MAX_IMAGES,
        message: `A post can have at most ${POST_MAX_IMAGES} images`,
      },
    },
    // A link to a video on YouTube or Vimeo, not an upload.
    videoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (url: string) => !url || safeVideoUrl(url) !== null,
        message: "The video link must be an https:// YouTube or Vimeo address",
      },
    },
    status: { type: String, enum: [...POST_STATUSES], default: "draft" },
    // What an admin last did to this post and why, shown to the vendor. An
    // unpublished post is a draft again and the note goes when the vendor
    // publishes it; a removed post keeps status "removed" for good.
    moderation: { type: ModerationSchema, default: undefined },
    // Set with the shop's products by the subscription sweep once the
    // subscription has been expired for more than 30 days, and cleared on
    // renewal. A hidden post is not shown on the public page.
    hiddenBySubscription: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The shop page lists one shop's published posts, newest first.
ShopPostSchema.index({ shopId: 1, status: 1, createdAt: -1 });

export const ShopPost: Model<IShopPost> =
  mongoose.models.ShopPost || mongoose.model<IShopPost>("ShopPost", ShopPostSchema);
