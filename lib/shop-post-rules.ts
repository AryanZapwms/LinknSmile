// lib/shop-post-rules.ts
//
// Limits and checks for a shop post (lib/models/shop-post.ts). Kept free of
// server-only imports: the posts screen (components/shop/post-editor.tsx)
// applies in the browser the same rules that lib/shop-posts.ts applies on
// the server. The server's check is the one that counts.

import { STOREFRONT_IMAGE_MAX_BYTES, detectImageType } from "@/lib/shop-storefront-rules";

/**
 * draft and published are the vendor's to set. removed is set by an admin
 * and is final: the vendor can only delete such a post.
 */
export const POST_STATUSES = ["draft", "published", "removed"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** The statuses a vendor may choose. */
export const VENDOR_POST_STATUSES = ["draft", "published"] as const;
export type VendorPostStatus = (typeof VENDOR_POST_STATUSES)[number];

/** What an admin did to a post (ShopPost.moderation.action). */
export const POST_MODERATION_ACTIONS = ["unpublished", "removed"] as const;
export type PostModerationAction = (typeof POST_MODERATION_ACTIONS)[number];

export const POST_TITLE_MAX_LENGTH = 150;
export const POST_TEXT_MAX_LENGTH = 5000;
export const POST_MAX_IMAGES = 10;
/** Per picture: the same limit as the store page banner. Same file types too. */
export const POST_IMAGE_MAX_BYTES = STOREFRONT_IMAGE_MAX_BYTES.banner;
export const POSTS_PER_SHOP_MAX = 100;
/** The reason an admin gives for unpublishing or removing a post. */
export const POST_MODERATION_REASON_MAX_LENGTH = 500;

/** Why a request about a post was refused; the screens turn these into text. */
export type PostErrorReason =
  | "TITLE_REQUIRED"
  | "TITLE_TOO_LONG"
  | "TEXT_TOO_LONG"
  | "VIDEO_URL"
  | "STATUS"
  | "IMAGES"
  | "IMAGE_TYPE"
  | "IMAGE_TOO_LARGE"
  | "TOO_MANY_IMAGES"
  | "TOO_MANY_POSTS"
  | "POST_REMOVED"
  | "NOT_PUBLISHED"
  | "ACTION"
  | "REASON_REQUIRED"
  | "REASON_TOO_LONG";

// Video links are accepted for YouTube and Vimeo only.
const VIDEO_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

/**
 * The link, if it is an https:// address on YouTube or Vimeo; otherwise
 * null. A post's video link ends up in an href, so anything else
 * (javascript:, data:, http:, another site) must never get that far.
 */
export function safeVideoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
    return VIDEO_HOSTS.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Why this file can't be a post picture, or null when it can. `head` is the
 * file's first IMAGE_SIGNATURE_BYTES bytes: the type is judged by content,
 * as for the store page images.
 */
export function checkPostImage(
  size: number,
  head: Uint8Array
): Extract<PostErrorReason, "IMAGE_TOO_LARGE" | "IMAGE_TYPE"> | null {
  if (size > POST_IMAGE_MAX_BYTES) return "IMAGE_TOO_LARGE";
  if (!detectImageType(head)) return "IMAGE_TYPE";
  return null;
}
