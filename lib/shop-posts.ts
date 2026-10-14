// lib/shop-posts.ts
//
// Everything that reads or changes a shop's posts (lib/models/shop-post.ts)
// for the vendor routes (app/api/vendor/posts) and the admin routes
// (app/api/admin/vendors/[id]/posts). Limits: lib/shop-post-rules.ts.
//
// Pictures arrive as files, one per request, and are stored here; a client
// never supplies an image URL. The only URLs that reach ShopPost.images are
// the ones our own storage returned, so the public page can hand them to
// next/image.

import mongoose from "mongoose";
import { ShopPost } from "@/lib/models/shop-post";
import { AuditLog } from "@/lib/models/audit-log";
import { getImageProvider } from "@/lib/storage";
import type { ErrorCode } from "@/lib/contracts/errors";
import {
  IMAGE_SIGNATURE_BYTES,
  STOREFRONT_IMAGE_EXTENSION,
  detectImageType,
} from "@/lib/shop-storefront-rules";
import {
  POSTS_PER_SHOP_MAX,
  POST_IMAGE_MAX_BYTES,
  POST_MAX_IMAGES,
  POST_MODERATION_REASON_MAX_LENGTH,
  POST_TEXT_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  VENDOR_POST_STATUSES,
  checkPostImage,
  safeVideoUrl,
  type PostErrorReason,
  type PostModerationAction,
  type PostStatus,
  type VendorPostStatus,
} from "@/lib/shop-post-rules";

/** A post as the vendor and admin screens receive it. */
export interface ShopPostView {
  _id: string;
  title: string;
  text: string;
  images: string[];
  videoUrl: string | null;
  status: PostStatus;
  /** What an admin last did to this post, and why. */
  moderation: { action: PostModerationAction; reason: string; at: string } | null;
  hiddenBySubscription: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PostField = "title" | "text" | "videoUrl" | "status" | "images" | "image" | "reason";

export interface PostFailure {
  ok: false;
  status: number;
  code: ErrorCode;
  message: string;
  field?: PostField;
  reason?: PostErrorReason;
}

/** The fields of a create or update request, as sent. Checked here. */
export interface PostInput {
  title?: unknown;
  text?: unknown;
  videoUrl?: unknown;
  status?: unknown;
  /** Update only: the post's current pictures, reordered and/or with some left out. */
  images?: unknown;
}

const megabytes = (bytes: number) => bytes / (1024 * 1024);

const invalid = (field: PostField, reason: PostErrorReason, message: string): PostFailure => ({
  ok: false,
  status: 400,
  code: "VALIDATION_ERROR",
  message,
  field,
  reason,
});

const POST_NOT_FOUND: PostFailure = {
  ok: false,
  status: 404,
  code: "NOT_FOUND",
  message: "Post not found",
};

const POST_REMOVED: PostFailure = {
  ok: false,
  status: 403,
  code: "FORBIDDEN",
  message: "This post was removed by an admin and can no longer be changed",
  reason: "POST_REMOVED",
};

const TOO_MANY_IMAGES = invalid(
  "image",
  "TOO_MANY_IMAGES",
  `A post can have at most ${POST_MAX_IMAGES} pictures`
);

function toView(doc: any): ShopPostView {
  return {
    _id: String(doc._id),
    title: doc.title,
    text: doc.text ?? "",
    images: doc.images ?? [],
    videoUrl: safeVideoUrl(doc.videoUrl),
    status: doc.status,
    moderation: doc.moderation
      ? {
          action: doc.moderation.action,
          reason: doc.moderation.reason,
          at: new Date(doc.moderation.at).toISOString(),
        }
      : null,
    hiddenBySubscription: !!doc.hiddenBySubscription,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

const validIds = (...ids: string[]) => ids.every((id) => mongoose.isValidObjectId(id));

/**
 * Checks the text fields of a create or update. A field that is absent is
 * left out of the result; `unsetVideo` means the link was cleared.
 */
function readFields(
  input: PostInput
):
  | { ok: true; set: Record<string, string>; unsetVideo: boolean; status?: VendorPostStatus }
  | PostFailure {
  const set: Record<string, string> = {};
  let unsetVideo = false;
  let status: VendorPostStatus | undefined;

  if (input.title !== undefined) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) return invalid("title", "TITLE_REQUIRED", "A post needs a title");
    if (title.length > POST_TITLE_MAX_LENGTH) {
      return invalid(
        "title",
        "TITLE_TOO_LONG",
        `Title must be ${POST_TITLE_MAX_LENGTH} characters or fewer`
      );
    }
    set.title = title;
  }

  if (input.text !== undefined) {
    // Browsers may send a textarea's line breaks as CRLF; count and store
    // them as the single characters the form counted.
    const text = typeof input.text === "string" ? input.text.replace(/\r\n?/g, "\n").trim() : "";
    if (text.length > POST_TEXT_MAX_LENGTH) {
      return invalid(
        "text",
        "TEXT_TOO_LONG",
        `Text must be ${POST_TEXT_MAX_LENGTH} characters or fewer`
      );
    }
    set.text = text;
  }

  if (input.videoUrl !== undefined) {
    const raw = typeof input.videoUrl === "string" ? input.videoUrl.trim() : input.videoUrl;
    if (raw === "" || raw === null) {
      unsetVideo = true;
    } else {
      const url = safeVideoUrl(raw);
      if (!url) {
        return invalid(
          "videoUrl",
          "VIDEO_URL",
          "The video link must be an https:// YouTube or Vimeo address"
        );
      }
      set.videoUrl = url;
    }
  }

  if (input.status !== undefined) {
    if (!(VENDOR_POST_STATUSES as readonly unknown[]).includes(input.status)) {
      return invalid("status", "STATUS", "Status must be draft or published");
    }
    status = input.status as VendorPostStatus;
  }

  return { ok: true, set, unsetVideo, status };
}

/** Every post of a shop, newest first, whatever its status. */
export async function listShopPosts(shopId: string): Promise<ShopPostView[]> {
  if (!validIds(shopId)) return [];
  const posts = await ShopPost.find({ shopId }).sort({ createdAt: -1 }).lean();
  return posts.map(toView);
}

export async function createShopPost(
  shopId: string,
  input: PostInput
): Promise<{ ok: true; post: ShopPostView } | PostFailure> {
  const fields = readFields({ ...input, title: input.title ?? "" });
  if (!fields.ok) return fields;

  if ((await ShopPost.countDocuments({ shopId })) >= POSTS_PER_SHOP_MAX) {
    return {
      ok: false,
      status: 409,
      code: "VALIDATION_ERROR",
      message: `A shop can have at most ${POSTS_PER_SHOP_MAX} posts. Delete one to add another.`,
      reason: "TOO_MANY_POSTS",
    };
  }

  // Pictures are added afterwards, one request each (addShopPostImage).
  const post = await ShopPost.create({ shopId, ...fields.set, status: fields.status ?? "draft" });
  return { ok: true, post: toView(post.toObject()) };
}

export async function updateShopPost(
  shopId: string,
  postId: string,
  input: PostInput
): Promise<{ ok: true; post: ShopPostView } | PostFailure> {
  if (!validIds(shopId, postId)) return POST_NOT_FOUND;
  const existing = await ShopPost.findOne({ _id: postId, shopId }).lean();
  if (!existing) return POST_NOT_FOUND;
  if (existing.status === "removed") return POST_REMOVED;

  const fields = readFields(input);
  if (!fields.ok) return fields;

  const set: Record<string, unknown> = { ...fields.set };
  const unset: Record<string, 1> = {};
  if (fields.unsetVideo) unset.videoUrl = 1;

  if (input.images !== undefined) {
    // Only what the post already has, each at most once: this can reorder
    // or drop pictures, never bring in a URL from somewhere else.
    const current = new Set(existing.images ?? []);
    const images = Array.isArray(input.images) ? input.images : null;
    if (
      !images ||
      new Set(images).size !== images.length ||
      !images.every((url) => typeof url === "string" && current.has(url))
    ) {
      return invalid("images", "IMAGES", "Pictures can only be reordered or removed here");
    }
    set.images = images;
  }

  if (fields.status) {
    set.status = fields.status;
    // Publishing again answers an admin's "unpublished" note.
    if (fields.status === "published") unset.moderation = 1;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) update.$set = set;
  if (Object.keys(unset).length > 0) update.$unset = unset;
  if (Object.keys(update).length === 0) return { ok: true, post: toView(existing) };

  const updated = await ShopPost.findOneAndUpdate(
    { _id: postId, shopId, status: { $ne: "removed" } },
    update,
    { new: true, runValidators: true }
  ).lean();
  if (!updated) return POST_REMOVED;
  return { ok: true, post: toView(updated) };
}

/** Reads the multipart body of an add-picture request: one file, field "image". */
export async function readPostImageForm(
  req: Request
): Promise<{ ok: true; file: File } | PostFailure> {
  // Refuse an oversized body before buffering it.
  if (Number(req.headers.get("content-length")) > POST_IMAGE_MAX_BYTES + 64 * 1024) {
    return {
      ok: false,
      status: 413,
      code: "VALIDATION_ERROR",
      message: "The upload is too large",
      field: "image",
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

  const entry = form.get("image");
  // A string here would be a client-supplied URL; only a file is accepted.
  if (entry === null || typeof entry === "string") {
    return invalid("image", "IMAGE_TYPE", "Picture must be a JPEG, PNG or WebP image");
  }
  return { ok: true, file: entry };
}

/** Validates and stores one picture, then adds it to the end of the post's pictures. */
export async function addShopPostImage(
  shopId: string,
  postId: string,
  file: File
): Promise<{ ok: true; post: ShopPostView } | PostFailure> {
  if (!validIds(shopId, postId)) return POST_NOT_FOUND;
  const existing = await ShopPost.findOne({ _id: postId, shopId }).select("status images").lean();
  if (!existing) return POST_NOT_FOUND;
  if (existing.status === "removed") return POST_REMOVED;
  if ((existing.images ?? []).length >= POST_MAX_IMAGES) return TOO_MANY_IMAGES;

  const head = new Uint8Array(await file.slice(0, IMAGE_SIGNATURE_BYTES).arrayBuffer());
  const reason = checkPostImage(file.size, head);
  if (reason) {
    return invalid(
      "image",
      reason,
      reason === "IMAGE_TOO_LARGE"
        ? `Picture must be ${megabytes(POST_IMAGE_MAX_BYTES)} MB or smaller`
        : "Picture must be a JPEG, PNG or WebP image"
    );
  }

  let url: string;
  try {
    // The stored name comes from the detected type, never from the upload's own name.
    const extension = STOREFRONT_IMAGE_EXTENSION[detectImageType(head)!];
    ({ url } = await getImageProvider().uploadImage({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: `post.${extension}`,
      folder: `link-and-smile/shops/${shopId}/posts`,
    }));
  } catch (error) {
    console.error("Post image upload failed:", error);
    return {
      ok: false,
      status: 502,
      code: "INTERNAL_ERROR",
      message: "Could not store the picture. Please try again.",
    };
  }

  // The limit is checked again in the same write that adds the picture, so
  // two uploads at once cannot take a post past it.
  const updated = await ShopPost.findOneAndUpdate(
    {
      _id: postId,
      shopId,
      status: { $ne: "removed" },
      [`images.${POST_MAX_IMAGES - 1}`]: { $exists: false },
    },
    { $push: { images: url } },
    { new: true }
  ).lean();
  if (!updated) return TOO_MANY_IMAGES;
  return { ok: true, post: toView(updated) };
}

/** A vendor deletes one of their own posts, whatever its status. */
export async function deleteShopPost(
  shopId: string,
  postId: string
): Promise<{ ok: true } | PostFailure> {
  if (!validIds(shopId, postId)) return POST_NOT_FOUND;
  const { deletedCount } = await ShopPost.deleteOne({ _id: postId, shopId });
  return deletedCount ? { ok: true } : POST_NOT_FOUND;
}

/**
 * An admin unpublishes a post (back to draft; the vendor may fix it and
 * publish again) or removes it (final). Both need a reason, which the vendor
 * sees, and both are written to AuditLog in the same transaction as the
 * change, so there is never one without the other.
 */
export async function moderateShopPost(
  shopId: string,
  postId: string,
  input: { action?: unknown; reason?: unknown },
  admin: { id: string; ip: string }
): Promise<{ ok: true; post: ShopPostView; changed: boolean } | PostFailure> {
  if (!validIds(shopId, postId)) return POST_NOT_FOUND;

  if (input.action !== "unpublish" && input.action !== "remove") {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Action must be unpublish or remove",
      reason: "ACTION",
    };
  }
  const action = input.action;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason) return invalid("reason", "REASON_REQUIRED", "Please give a reason");
  if (reason.length > POST_MODERATION_REASON_MAX_LENGTH) {
    return invalid(
      "reason",
      "REASON_TOO_LONG",
      `Reason must be ${POST_MODERATION_REASON_MAX_LENGTH} characters or fewer`
    );
  }

  const existing = await ShopPost.findOne({ _id: postId, shopId }).lean();
  if (!existing) return POST_NOT_FOUND;
  // Removing twice changes nothing and is not logged twice.
  if (existing.status === "removed") {
    return action === "remove" ? { ok: true, post: toView(existing), changed: false } : POST_REMOVED;
  }
  if (action === "unpublish" && existing.status !== "published") {
    return {
      ok: false,
      status: 409,
      code: "VALIDATION_ERROR",
      message: "Only a published post can be unpublished",
      reason: "NOT_PUBLISHED",
    };
  }

  const nextStatus: PostStatus = action === "remove" ? "removed" : "draft";
  const moderation = {
    action: (action === "remove" ? "removed" : "unpublished") as PostModerationAction,
    reason,
    at: new Date(),
  };

  let updated: any = null;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Only from the status just read: if the post changed meanwhile,
      // nothing is written and the caller is told.
      updated = await ShopPost.findOneAndUpdate(
        { _id: postId, shopId, status: existing.status },
        { $set: { status: nextStatus, moderation } },
        { new: true, session }
      ).lean();
      if (!updated) return;
      await AuditLog.create(
        [
          {
            action: action === "remove" ? "SHOP_POST_REMOVED" : "SHOP_POST_UNPUBLISHED",
            performedBy: admin.id,
            targetEntity: "ShopPost",
            targetId: existing._id,
            shopId: existing.shopId,
            before: { status: existing.status, title: existing.title },
            after: { status: nextStatus },
            reason,
            ipAddress: admin.ip,
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  if (!updated) {
    return {
      ok: false,
      status: 409,
      code: "VALIDATION_ERROR",
      message: "The post changed while this was being saved. Reload and try again.",
    };
  }
  return { ok: true, post: toView(updated), changed: true };
}
