// lib/shop-storefront.ts
//
// Saves the editable part of a shop's public page (app/shop/[slug]) — logo,
// banner (Shop.coverImage) and description — for both the vendor route
// (app/api/vendor/storefront) and the admin route
// (app/api/admin/vendors/[id]/storefront).
//
// Images arrive as files and are stored here; a client never supplies an
// image URL. The public page renders these with next/image, which throws
// for any host missing from next.config.mjs, so the only URLs that may
// reach Shop.logo / Shop.coverImage are the ones our own storage returns.

import mongoose from "mongoose";
import Shop from "@/lib/models/shop";
import { getImageProvider } from "@/lib/storage";
import type { ErrorCode } from "@/lib/contracts/errors";
import {
  IMAGE_SIGNATURE_BYTES,
  STOREFRONT_DESCRIPTION_MAX_LENGTH,
  STOREFRONT_IMAGE_EXTENSION,
  STOREFRONT_IMAGE_MAX_BYTES,
  STOREFRONT_REMOVE_FIELD,
  checkStorefrontImage,
  detectImageType,
  type StorefrontErrorReason,
  type StorefrontImageKind,
} from "@/lib/shop-storefront-rules";

const KINDS: StorefrontImageKind[] = ["logo", "banner"];
const SHOP_FIELD: Record<StorefrontImageKind, "logo" | "coverImage"> = {
  logo: "logo",
  banner: "coverImage",
};
const LABEL: Record<StorefrontImageKind, string> = { logo: "Logo", banner: "Banner" };
const STOREFRONT_SELECT = "shopName slug description logo coverImage";

// Both images at their limit, plus room for the description and the
// multipart framing.
const MAX_REQUEST_BYTES =
  STOREFRONT_IMAGE_MAX_BYTES.logo + STOREFRONT_IMAGE_MAX_BYTES.banner + 64 * 1024;

export interface StorefrontInput {
  /** undefined leaves the description as it is. */
  description?: string;
  /** A file replaces the image, null removes it, undefined leaves it. */
  logo?: File | null;
  banner?: File | null;
}

export interface StorefrontFields {
  _id: string;
  shopName: string;
  slug: string;
  description: string;
  logo: string | null;
  coverImage: string | null;
}

export interface StorefrontFailure {
  ok: false;
  status: number;
  code: ErrorCode;
  message: string;
  field?: StorefrontImageKind | "description";
  reason?: StorefrontErrorReason;
}

export interface StorefrontSaved {
  ok: true;
  shop: StorefrontFields;
  before: StorefrontFields;
  /** Shop fields whose value actually changed. */
  changed: (keyof StorefrontFields)[];
}

const megabytes = (bytes: number) => bytes / (1024 * 1024);

function imageFailure(kind: StorefrontImageKind, reason: StorefrontErrorReason): StorefrontFailure {
  const message =
    reason === "IMAGE_TOO_LARGE"
      ? `${LABEL[kind]} must be ${megabytes(STOREFRONT_IMAGE_MAX_BYTES[kind])} MB or smaller`
      : `${LABEL[kind]} must be a JPEG, PNG or WebP image`;
  return { ok: false, status: 400, code: "VALIDATION_ERROR", message, field: kind, reason };
}

const SHOP_NOT_FOUND: StorefrontFailure = {
  ok: false,
  status: 404,
  code: "SHOP_NOT_FOUND",
  message: "Shop not found",
};

function toFields(doc: any): StorefrontFields {
  return {
    _id: String(doc._id),
    shopName: doc.shopName,
    slug: doc.slug,
    description: doc.description ?? "",
    logo: doc.logo ?? null,
    coverImage: doc.coverImage ?? null,
  };
}

/** Reads the multipart body of a storefront PUT into a StorefrontInput. */
export async function readStorefrontForm(
  req: Request
): Promise<{ ok: true; input: StorefrontInput } | StorefrontFailure> {
  // Refuse an oversized body before buffering it.
  if (Number(req.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "VALIDATION_ERROR",
      message: "The upload is too large",
      reason: "IMAGE_TOO_LARGE",
    };
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Expected multipart form data",
    };
  }

  const input: StorefrontInput = {};
  const description = form.get("description");
  if (typeof description === "string") input.description = description;

  for (const kind of KINDS) {
    const entry = form.get(kind);
    if (entry !== null) {
      // A string here would be a client-supplied URL; only files are accepted.
      if (typeof entry === "string") return imageFailure(kind, "IMAGE_TYPE");
      input[kind] = entry;
    } else if (form.get(STOREFRONT_REMOVE_FIELD[kind]) === "true") {
      input[kind] = null;
    }
  }
  return { ok: true, input };
}

/**
 * Validates everything, stores any new images, then updates the shop.
 * Nothing is stored or written unless the whole input is valid.
 */
export async function saveStorefront(
  shopId: string,
  input: StorefrontInput
): Promise<StorefrontSaved | StorefrontFailure> {
  if (!mongoose.isValidObjectId(shopId)) return SHOP_NOT_FOUND;
  const existing = await Shop.findById(shopId).select(STOREFRONT_SELECT).lean();
  if (!existing) return SHOP_NOT_FOUND;
  const before = toFields(existing);

  const set: Record<string, string> = {};
  const unset: Record<string, 1> = {};

  if (input.description !== undefined) {
    // Browsers send a textarea's line breaks as CRLF in multipart bodies;
    // count and store them as the single characters the form counted.
    const description = input.description.replace(/\r\n?/g, "\n").trim();
    if (description.length > STOREFRONT_DESCRIPTION_MAX_LENGTH) {
      return {
        ok: false,
        status: 400,
        code: "VALIDATION_ERROR",
        message: `Description must be ${STOREFRONT_DESCRIPTION_MAX_LENGTH} characters or fewer`,
        field: "description",
        reason: "DESCRIPTION_TOO_LONG",
      };
    }
    set.description = description;
  }

  const uploads: { kind: StorefrontImageKind; buffer: Buffer; filename: string }[] = [];
  for (const kind of KINDS) {
    const file = input[kind];
    if (file === undefined) continue;
    if (file === null) {
      unset[SHOP_FIELD[kind]] = 1;
      continue;
    }
    const head = new Uint8Array(await file.slice(0, IMAGE_SIGNATURE_BYTES).arrayBuffer());
    const reason = checkStorefrontImage(kind, file.size, head);
    if (reason) return imageFailure(kind, reason);
    // The stored name comes from the detected type, never from the upload's own name.
    const extension = STOREFRONT_IMAGE_EXTENSION[detectImageType(head)!];
    uploads.push({
      kind,
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: `${kind}.${extension}`,
    });
  }

  if (uploads.length > 0) {
    try {
      const provider = getImageProvider();
      for (const { kind, buffer, filename } of uploads) {
        const { url } = await provider.uploadImage({
          buffer,
          filename,
          folder: `link-and-smile/shops/${shopId}`,
        });
        set[SHOP_FIELD[kind]] = url;
      }
    } catch (error) {
      console.error("Storefront image upload failed:", error);
      return {
        ok: false,
        status: 502,
        code: "INTERNAL_ERROR",
        message: "Could not store the image. Please try again.",
      };
    }
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) update.$set = set;
  if (Object.keys(unset).length > 0) update.$unset = unset;
  if (Object.keys(update).length === 0) return { ok: true, shop: before, before, changed: [] };

  const updated = await Shop.findByIdAndUpdate(shopId, update, { new: true })
    .select(STOREFRONT_SELECT)
    .lean();
  if (!updated) return SHOP_NOT_FOUND;
  const shop = toFields(updated);

  const changed = (Object.keys(shop) as (keyof StorefrontFields)[]).filter(
    (key) => shop[key] !== before[key]
  );
  return { ok: true, shop, before, changed };
}
