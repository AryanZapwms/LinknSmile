// lib/shop-storefront-rules.ts
//
// Limits for the editable part of a shop's public page: logo, banner
// (Shop.coverImage) and description. (The store type saved alongside them
// has its own file, lib/shop-store-type.ts.) Imported by the browser form
// (components/shop/storefront-editor.tsx) and by the server
// (lib/shop-storefront.ts), so both apply the same rules — the server's
// check is the one that counts. Nothing server-only may be imported here.

export type StorefrontImageKind = "logo" | "banner";
export type StorefrontImageType = "image/jpeg" | "image/png" | "image/webp";
export type StorefrontErrorReason =
  | "IMAGE_TYPE"
  | "IMAGE_TOO_LARGE"
  | "DESCRIPTION_TOO_LONG"
  | "STORE_TYPE";

export const STOREFRONT_IMAGE_MAX_BYTES: Record<StorefrontImageKind, number> = {
  logo: 2 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
};

export const STOREFRONT_DESCRIPTION_MAX_LENGTH = 1000;

export const STOREFRONT_IMAGE_EXTENSION: Record<StorefrontImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Multipart field names of a storefront PUT: "description", "storeType", a
 * file under each image's own name ("logo", "banner"), and these set to
 * "true" to clear an image.
 */
export const STOREFRONT_REMOVE_FIELD: Record<StorefrontImageKind, string> = {
  logo: "removeLogo",
  banner: "removeBanner",
};

/** For <input type="file" accept>. */
export const STOREFRONT_IMAGE_ACCEPT = Object.keys(STOREFRONT_IMAGE_EXTENSION).join(",");

/** How many leading bytes detectImageType needs to see. */
export const IMAGE_SIGNATURE_BYTES = 12;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b);

/**
 * The image type according to the file's first bytes. A file's name and
 * declared type are whatever the sender says they are, so they are never
 * consulted — an SVG or HTML file renamed to .png is not a PNG.
 */
export function detectImageType(bytes: Uint8Array): StorefrontImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF" <4-byte length> "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

/** Why this file can't be used as a logo/banner, or null when it can. */
export function checkStorefrontImage(
  kind: StorefrontImageKind,
  size: number,
  head: Uint8Array
): StorefrontErrorReason | null {
  if (size > STOREFRONT_IMAGE_MAX_BYTES[kind]) return "IMAGE_TOO_LARGE";
  if (!detectImageType(head)) return "IMAGE_TYPE";
  return null;
}
