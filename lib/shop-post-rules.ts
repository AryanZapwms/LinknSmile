// lib/shop-post-rules.ts
//
// Limits for a shop post (lib/models/shop-post.ts). Kept free of
// server-only imports so the posts screen, when it is built, can apply the
// same limits in the browser.

export const POST_STATUSES = ["draft", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_TITLE_MAX_LENGTH = 150;
export const POST_TEXT_MAX_LENGTH = 5000;
export const POST_MAX_IMAGES = 10;

/**
 * The link, if it is a plain https:// address; otherwise null. A post's
 * video link ends up in an href, so anything else (javascript:, data:,
 * http:) must never get that far.
 */
export function safeVideoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
