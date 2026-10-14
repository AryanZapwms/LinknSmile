// Vendor posts: the vendor routes (app/api/vendor/posts...), the admin
// routes (app/api/admin/vendors/[id]/posts...), and what the public shop page
// and the subscription sweep do with them — against an in-memory MongoDB with
// the image storage provider stubbed out.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";
import { POSTS_PER_SHOP_MAX, POST_IMAGE_MAX_BYTES, POST_MAX_IMAGES, safeVideoUrl } from "@/lib/shop-post-rules";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
// The subscription sweep sends reminder emails; none may leave a test.
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  sendEmail: async () => {},
}));
const storage = vi.hoisted(() => ({
  uploads: [] as { folder: string; filename: string; bytes: number }[],
  down: false,
}));
vi.mock("@/lib/storage", () => ({
  getImageProvider: () => ({
    name: "cloudinary",
    uploadImage: async ({ buffer, filename, folder }: any) => {
      if (storage.down) throw new Error("storage unavailable");
      storage.uploads.push({ folder, filename, bytes: buffer.length });
      return { url: `https://res.cloudinary.com/test/${folder}/${storage.uploads.length}-${filename}` };
    },
  }),
}));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let listRoute: typeof import("@/app/api/vendor/posts/route");
let postRoute: typeof import("@/app/api/vendor/posts/[id]/route");
let imageRoute: typeof import("@/app/api/vendor/posts/[id]/images/route");
let adminListRoute: typeof import("@/app/api/admin/vendors/[id]/posts/route");
let adminPostRoute: typeof import("@/app/api/admin/vendors/[id]/posts/[postId]/route");
let CURRENT_MOU_VERSION: string;

const ADMIN_ID = String(new mongoose.Types.ObjectId());
const admin = { user: { id: ADMIN_ID, email: "admin@example.com", name: "Admin", role: "admin", shopId: null } };

const DAY = 24 * 60 * 60 * 1000;
const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

async function makeVendor(o: { mou?: boolean; approved?: boolean; expiredDaysAgo?: number; storeType?: string } = {}) {
  const n = ++seq;
  const userId = oid();
  const shopId = oid();
  await db.collection("users").insertOne({ _id: userId, email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", isActive: true, isVerified: true, shopId });
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: userId, shopName: `Shop ${n}`, slug: `shop-${n}`, description: "", isApproved: o.approved ?? true, isActive: true,
    address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    ...(o.storeType ? { storeType: o.storeType } : {}),
  });
  if (o.mou ?? true) {
    await db.collection("vendormouacceptances").insertOne({ userId, shopId, mouVersion: CURRENT_MOU_VERSION, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
  }
  const expiryDate = o.expiredDaysAgo ? new Date(Date.now() - o.expiredDaysAgo * DAY) : new Date(Date.now() + 30 * DAY);
  await db.collection("vendorsubscriptions").insertOne({ shopId, paymentHistory: [], amount: 999, currency: "INR", status: o.expiredDaysAgo ? "expired" : "active", expiryDate });
  const session = { user: { id: String(userId), email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", shopId: String(shopId) } };
  return { shopId, id: String(shopId), slug: `shop-${n}`, session, folder: `link-and-smile/shops/${shopId}/posts` };
}

const SIGNATURES = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff, 0xe0],
  webp: [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")],
  gif: [...Buffer.from("GIF89a")],
};
/** A file of `size` bytes whose content starts like the given image format. */
function image(format: keyof typeof SIGNATURES, o: { size?: number; name?: string; type?: string } = {}) {
  const bytes = new Uint8Array(o.size ?? 64);
  bytes.set(SIGNATURES[format]);
  return new File([bytes], o.name ?? `picture.${format}`, { type: o.type ?? `image/${format}` });
}
function imageForm(entry: File | string) {
  const data = new FormData();
  data.append("image", entry);
  return data;
}

const list = () => call(listRoute.GET, "/api/vendor/posts");
const create = (body: unknown) => call(listRoute.POST, "/api/vendor/posts", { method: "POST", body });
const update = (id: string, body: unknown) => call(postRoute.PUT, `/api/vendor/posts/${id}`, { method: "PUT", body, params: { id } });
const remove = (id: string) => call(postRoute.DELETE, `/api/vendor/posts/${id}`, { method: "DELETE", params: { id } });
const addImage = (id: string, entry: File | string) => call(imageRoute.POST, `/api/vendor/posts/${id}/images`, { method: "POST", body: imageForm(entry), params: { id } });
const stored = (id: string) => db.collection("shopposts").findOne({ _id: new mongoose.Types.ObjectId(id) });

/** A post put straight into the database, for states a vendor cannot create. */
async function seedPost(shopId: mongoose.Types.ObjectId, over: Record<string, unknown> = {}) {
  const _id = oid();
  await db.collection("shopposts").insertOne({ _id, shopId, title: "Seeded", text: "", images: [], status: "draft", hiddenBySubscription: false, createdAt: new Date(), updatedAt: new Date(), ...over });
  return String(_id);
}

beforeAll(async () => {
  db = await startTestDb();
  ({ CURRENT_MOU_VERSION } = await import("@/lib/mou-content"));
  listRoute = await import("@/app/api/vendor/posts/route");
  postRoute = await import("@/app/api/vendor/posts/[id]/route");
  imageRoute = await import("@/app/api/vendor/posts/[id]/images/route");
  adminListRoute = await import("@/app/api/admin/vendors/[id]/posts/route");
  adminPostRoute = await import("@/app/api/admin/vendors/[id]/posts/[postId]/route");
  await import("@/lib/models/vendor-subscription-settings");
  await import("@/lib/models/audit-log");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(() => {
  auth.session = null;
  storage.uploads.length = 0;
  storage.down = false;
});

describe("safeVideoUrl", () => {
  it("passes https YouTube and Vimeo links and nothing else", () => {
    for (const ok of ["https://www.youtube.com/watch?v=abc", "https://youtube.com/shorts/abc", "https://m.youtube.com/watch?v=abc", "https://youtu.be/abc", "https://vimeo.com/123", "https://www.vimeo.com/123", "https://player.vimeo.com/video/123"]) {
      expect(safeVideoUrl(ok), ok).toBe(ok);
    }
    for (const bad of [
      "http://www.youtube.com/watch?v=abc", "https://example.com/video.mp4", "https://youtube.com.evil.example/watch", "https://evil.example/?u=https://youtu.be/abc",
      "https://notyoutube.com/watch", "https://youtu.be:8443/abc", "https://user:pass@youtu.be/abc", "javascript:alert(1)", "youtu.be/abc", "", null, 42,
    ]) {
      expect(safeVideoUrl(bad), String(bad)).toBeNull();
    }
  });
});

describe("vendor posts: create, list, edit, publish, delete", () => {
  it("creates a draft, lists it with the store type, then edits, publishes, unpublishes and deletes it", async () => {
    const v = await makeVendor({ storeType: "services" });
    auth.session = v.session;

    const created = await create({ title: "  Bridal makeup  ", text: "Line one\r\nLine two", videoUrl: " https://youtu.be/abc " });
    expect(created).toMatchObject({ status: 201, body: { success: true, post: { title: "Bridal makeup", text: "Line one\nLine two", videoUrl: "https://youtu.be/abc", status: "draft", images: [], moderation: null } } });
    const id = created.body.post._id as string;
    expect(await stored(id)).toMatchObject({ shopId: v.shopId, status: "draft", hiddenBySubscription: false });

    expect(await list()).toMatchObject({ status: 200, body: { success: true, storeType: "services", shopSlug: v.slug, posts: [{ _id: id, title: "Bridal makeup" }] } });

    expect(await update(id, { title: "Bridal makeup offer", status: "published" })).toMatchObject({ status: 200, body: { post: { title: "Bridal makeup offer", text: "Line one\nLine two", status: "published" } } });
    // An absent field is left alone; an empty video link clears it.
    expect(await update(id, { videoUrl: "" })).toMatchObject({ status: 200, body: { post: { title: "Bridal makeup offer", videoUrl: null, status: "published" } } });
    expect(await stored(id)).not.toHaveProperty("videoUrl");
    expect(await update(id, { status: "draft" })).toMatchObject({ status: 200, body: { post: { status: "draft" } } });

    expect(await remove(id)).toMatchObject({ status: 200, body: { success: true } });
    expect(await stored(id)).toBeNull();
    expect(await remove(id)).toMatchObject({ status: 404, body: { code: "NOT_FOUND" } });
  });

  it("can publish straight away, and a shop without a saved store type reads as products", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    expect(await create({ title: "Open now", status: "published" })).toMatchObject({ status: 201, body: { post: { status: "published", text: "", videoUrl: null } } });
    expect((await list()).body.storeType).toBe("products");
  });

  it("refuses a missing or too long title, too long text, a bad video link and a status a vendor cannot set", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    const cases: [unknown, string, string][] = [
      [{}, "title", "TITLE_REQUIRED"],
      [{ title: "   " }, "title", "TITLE_REQUIRED"],
      [{ title: "x".repeat(151) }, "title", "TITLE_TOO_LONG"],
      [{ title: "T", text: "x".repeat(5001) }, "text", "TEXT_TOO_LONG"],
      [{ title: "T", videoUrl: "https://example.com/video.mp4" }, "videoUrl", "VIDEO_URL"],
      [{ title: "T", videoUrl: "http://youtu.be/abc" }, "videoUrl", "VIDEO_URL"],
      [{ title: "T", status: "removed" }, "status", "STATUS"],
    ];
    for (const [body, field, reason] of cases) {
      expect(await create(body), reason).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR", field, reason } });
    }
    expect(await call(listRoute.POST, "/api/vendor/posts", { method: "POST", body: "not json" })).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR" } });
    expect(await db.collection("shopposts").countDocuments({ shopId: v.shopId })).toBe(0);

    // The same checks on an edit, and the post is left as it was.
    const id = (await create({ title: "Fine", text: "Fine text" })).body.post._id;
    expect(await update(id, { title: "" })).toMatchObject({ status: 400, body: { reason: "TITLE_REQUIRED" } });
    expect(await update(id, { videoUrl: "javascript:alert(1)" })).toMatchObject({ status: 400, body: { reason: "VIDEO_URL" } });
    expect(await update(id, { status: "removed" })).toMatchObject({ status: 400, body: { reason: "STATUS" } });
    expect(await stored(id)).toMatchObject({ title: "Fine", text: "Fine text", status: "draft" });
    // The longest allowed values are accepted.
    expect(await update(id, { title: "x".repeat(150), text: "y".repeat(5000) })).toMatchObject({ status: 200 });
  });

  it("only ever touches the caller's own shop", async () => {
    const mine = await makeVendor();
    const other = await makeVendor();
    const theirs = await seedPost(other.shopId, { title: "Theirs", status: "published" });
    auth.session = mine.session;

    expect((await list()).body.posts).toEqual([]);
    expect(await update(theirs, { title: "Hijacked" })).toMatchObject({ status: 404, body: { code: "NOT_FOUND" } });
    expect(await addImage(theirs, image("png"))).toMatchObject({ status: 404 });
    expect(await remove(theirs)).toMatchObject({ status: 404 });
    expect(await update("not-an-id", { title: "X" })).toMatchObject({ status: 404 });
    expect(await stored(theirs)).toMatchObject({ title: "Theirs", status: "published", images: [] });
    expect(storage.uploads).toEqual([]);
  });

  it("allows at most 100 posts per shop", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    await db.collection("shopposts").insertMany(Array.from({ length: POSTS_PER_SHOP_MAX }, (_, i) => ({ shopId: v.shopId, title: `P${i}`, status: "draft", images: [], createdAt: new Date(), updatedAt: new Date() })));
    expect(await create({ title: "One too many" })).toMatchObject({ status: 409, body: { code: "VALIDATION_ERROR", reason: "TOO_MANY_POSTS" } });
    expect(await db.collection("shopposts").countDocuments({ shopId: v.shopId })).toBe(POSTS_PER_SHOP_MAX);
  });
});

describe("vendor posts: pictures", () => {
  it("stores JPEG, PNG and WebP by content under the shop's folder, in the order added", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    const id = (await create({ title: "With pictures" })).body.post._id;

    // The declared name and type are ignored: the content decides.
    const first = await addImage(id, image("jpeg", { name: "evil.html", type: "text/html" }));
    expect(first).toMatchObject({ status: 201, body: { success: true } });
    await addImage(id, image("png"));
    const third = await addImage(id, image("webp", { size: POST_IMAGE_MAX_BYTES }));

    expect(storage.uploads).toEqual([
      { folder: v.folder, filename: "post.jpg", bytes: 64 },
      { folder: v.folder, filename: "post.png", bytes: 64 },
      { folder: v.folder, filename: "post.webp", bytes: POST_IMAGE_MAX_BYTES },
    ]);
    const urls = third.body.post.images as string[];
    expect(urls).toHaveLength(3);
    expect(urls.every((u) => u.startsWith(`https://res.cloudinary.com/test/${v.folder}/`))).toBe(true);
    expect((await stored(id))?.images).toEqual(urls);
  });

  it("refuses a picture that is too large, not an image, or sent as a URL, and stores nothing", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    const id = (await create({ title: "Strict" })).body.post._id;

    expect(await addImage(id, image("png", { size: POST_IMAGE_MAX_BYTES + 1 }))).toMatchObject({ status: 400, body: { field: "image", reason: "IMAGE_TOO_LARGE" } });
    expect(await addImage(id, image("gif", { name: "anim.png", type: "image/png" }))).toMatchObject({ status: 400, body: { field: "image", reason: "IMAGE_TYPE" } });
    expect(await addImage(id, new File(["<svg onload=alert(1)>"], "x.png", { type: "image/png" }))).toMatchObject({ status: 400, body: { reason: "IMAGE_TYPE" } });
    expect(await addImage(id, "https://evil.example/tracker.png")).toMatchObject({ status: 400, body: { reason: "IMAGE_TYPE" } });
    expect(await call(imageRoute.POST, `/api/vendor/posts/${id}/images`, { method: "POST", body: imageForm(image("png")), params: { id }, headers: { "content-length": String(POST_IMAGE_MAX_BYTES + 1024 * 1024) } })).toMatchObject({ status: 413, body: { reason: "IMAGE_TOO_LARGE" } });
    expect(await call(imageRoute.POST, `/api/vendor/posts/${id}/images`, { method: "POST", body: { image: "x" }, params: { id } })).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR" } });

    expect(storage.uploads).toEqual([]);
    expect((await stored(id))?.images).toEqual([]);
  });

  it("holds at most 10 pictures, and reports a storage failure without changing the post", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    const id = (await create({ title: "Full" })).body.post._id;

    storage.down = true;
    expect(await addImage(id, image("png"))).toMatchObject({ status: 502, body: { code: "INTERNAL_ERROR" } });
    expect((await stored(id))?.images).toEqual([]);
    storage.down = false;

    for (let i = 0; i < POST_MAX_IMAGES; i++) expect((await addImage(id, image("png"))).status).toBe(201);
    expect(await addImage(id, image("png"))).toMatchObject({ status: 400, body: { reason: "TOO_MANY_IMAGES" } });
    expect(storage.uploads).toHaveLength(POST_MAX_IMAGES);
    expect((await stored(id))?.images).toHaveLength(POST_MAX_IMAGES);
  });

  it("can reorder and drop its own pictures, but never take a URL from the request", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    const id = (await create({ title: "Gallery" })).body.post._id;
    for (let i = 0; i < 3; i++) await addImage(id, image("png"));
    const [a, b, c] = (await stored(id))!.images as string[];

    expect(await update(id, { images: [c, a] })).toMatchObject({ status: 200, body: { post: { images: [c, a] } } });
    for (const images of [[c, "https://evil.example/x.png"], [b], [c, c], "nope", [c, 7]]) {
      expect(await update(id, { images }), JSON.stringify(images)).toMatchObject({ status: 400, body: { field: "images", reason: "IMAGES" } });
    }
    expect((await stored(id))?.images).toEqual([c, a]);
    expect(await update(id, { images: [] })).toMatchObject({ status: 200, body: { post: { images: [] } } });
  });
});

describe("vendor posts: who may use them", () => {
  it("needs a signed-in vendor with the MOU accepted, an approved shop and an active subscription", async () => {
    const every = async () => [
      await list(),
      await create({ title: "T" }),
      await update(String(oid()), { title: "T" }),
      await remove(String(oid())),
      await addImage(String(oid()), image("png")),
    ];
    const expectAll = async (status: number, code: string) => {
      for (const res of await every()) expect(res).toMatchObject({ status, body: { code } });
    };

    await expectAll(401, "UNAUTHORIZED");
    auth.session = { user: { id: String(oid()), email: "c@example.com", name: "C", role: "user", shopId: null } };
    await expectAll(403, "NOT_VENDOR");
    auth.session = (await makeVendor({ mou: false })).session;
    await expectAll(403, "MOU_REQUIRED");
    auth.session = (await makeVendor({ expiredDaysAgo: 20 })).session;
    await expectAll(403, "SUBSCRIPTION_EXPIRED");
    auth.session = (await makeVendor({ approved: false })).session;
    await expectAll(403, "SHOP_PENDING");

    expect(await db.collection("shopposts").countDocuments({ title: "T" })).toBe(0);
    expect(storage.uploads).toEqual([]);
  });
});

describe("vendor posts: after an admin acted", () => {
  it("a removed post can only be deleted", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    const moderation = { action: "removed", reason: "Not allowed here", at: new Date() };
    const id = await seedPost(v.shopId, { status: "removed", moderation });

    expect((await list()).body.posts[0]).toMatchObject({ _id: id, status: "removed", moderation: { action: "removed", reason: "Not allowed here" } });
    expect(await update(id, { title: "Changed" })).toMatchObject({ status: 403, body: { code: "FORBIDDEN", reason: "POST_REMOVED" } });
    expect(await update(id, { status: "published" })).toMatchObject({ status: 403, body: { reason: "POST_REMOVED" } });
    expect(await addImage(id, image("png"))).toMatchObject({ status: 403, body: { reason: "POST_REMOVED" } });
    expect(await stored(id)).toMatchObject({ title: "Seeded", status: "removed" });
    expect(storage.uploads).toEqual([]);

    expect(await remove(id)).toMatchObject({ status: 200 });
    expect(await stored(id)).toBeNull();
  });

  it("an unpublished post keeps the admin's reason until the vendor publishes it again", async () => {
    const v = await makeVendor();
    auth.session = v.session;
    const id = await seedPost(v.shopId, { status: "draft", moderation: { action: "unpublished", reason: "Fix the price", at: new Date() } });

    expect(await update(id, { text: "Corrected" })).toMatchObject({ status: 200, body: { post: { status: "draft", moderation: { action: "unpublished", reason: "Fix the price" } } } });
    expect(await update(id, { status: "published" })).toMatchObject({ status: 200, body: { post: { status: "published", moderation: null } } });
    expect(await stored(id)).not.toHaveProperty("moderation");
  });
});

describe("admin: a vendor's posts", () => {
  const adminList = (shopId: string) => call(adminListRoute.GET, `/api/admin/vendors/${shopId}/posts`, { params: { id: shopId } });
  const moderate = (shopId: string, postId: string, body: unknown) =>
    call(adminPostRoute.PATCH, `/api/admin/vendors/${shopId}/posts/${postId}`, { method: "PATCH", body, params: { id: shopId, postId }, ip: "203.0.113.9" });
  const audit = (postId: string) => db.collection("auditlogs").find({ targetEntity: "ShopPost", targetId: new mongoose.Types.ObjectId(postId) }).toArray();

  it("lists every post of that shop, whatever its status, and no other shop's", async () => {
    const v = await makeVendor();
    const other = await makeVendor();
    await seedPost(v.shopId, { title: "Draft", status: "draft", createdAt: new Date(Date.now() - 3000) });
    await seedPost(v.shopId, { title: "Live", status: "published", createdAt: new Date(Date.now() - 2000) });
    await seedPost(v.shopId, { title: "Gone", status: "removed", moderation: { action: "removed", reason: "Spam", at: new Date() }, createdAt: new Date(Date.now() - 1000) });
    await seedPost(other.shopId, { title: "Other shop" });

    auth.session = admin;
    const res = await adminList(v.id);
    expect(res).toMatchObject({ status: 200, body: { success: true } });
    expect(res.body.posts.map((p: any) => [p.title, p.status])).toEqual([["Gone", "removed"], ["Live", "published"], ["Draft", "draft"]]);
    expect(await adminList(String(oid()))).toMatchObject({ status: 404, body: { code: "SHOP_NOT_FOUND" } });
    expect(await adminList("not-an-id")).toMatchObject({ status: 404, body: { code: "SHOP_NOT_FOUND" } });
  });

  it("needs an admin", async () => {
    const v = await makeVendor();
    const id = await seedPost(v.shopId, { status: "published" });
    for (const session of [null, v.session, { user: { id: String(oid()), email: "c@example.com", name: "C", role: "user", shopId: null } }]) {
      auth.session = session;
      expect(await adminList(v.id)).toMatchObject({ status: 401 });
      expect(await moderate(v.id, id, { action: "remove", reason: "Because" })).toMatchObject({ status: 401 });
    }
    expect(await stored(id)).toMatchObject({ status: "published" });
    expect(await audit(id)).toEqual([]);
  });

  it("unpublish: back to draft with the reason, logged; the vendor sees it and may publish again", async () => {
    const v = await makeVendor();
    const id = await seedPost(v.shopId, { title: "Half price", status: "published" });

    auth.session = admin;
    expect(await moderate(v.id, id, { action: "unpublish", reason: "  The price is wrong  " })).toMatchObject({
      status: 200, body: { success: true, post: { _id: id, status: "draft", moderation: { action: "unpublished", reason: "The price is wrong" } } },
    });
    const log = await audit(id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      action: "SHOP_POST_UNPUBLISHED", performedBy: ADMIN_ID, targetEntity: "ShopPost", shopId: v.shopId,
      before: { status: "published", title: "Half price" }, after: { status: "draft" }, reason: "The price is wrong", ipAddress: "203.0.113.9",
    });
    // Nothing to unpublish any more: refused, and not logged again.
    expect(await moderate(v.id, id, { action: "unpublish", reason: "Again" })).toMatchObject({ status: 409, body: { reason: "NOT_PUBLISHED" } });
    expect(await audit(id)).toHaveLength(1);

    auth.session = v.session;
    expect((await list()).body.posts[0]).toMatchObject({ status: "draft", moderation: { action: "unpublished", reason: "The price is wrong" } });
    expect(await update(id, { status: "published" })).toMatchObject({ status: 200, body: { post: { status: "published", moderation: null } } });
  });

  it("remove: final, logged once, safe to repeat, and the vendor can only delete it", async () => {
    const v = await makeVendor();
    const id = await seedPost(v.shopId, { title: "Fake offer", status: "published" });
    const draft = await seedPost(v.shopId, { title: "Bad draft", status: "draft" });

    auth.session = admin;
    expect(await moderate(v.id, id, { action: "remove", reason: "Misleading" })).toMatchObject({ status: 200, body: { post: { status: "removed", moderation: { action: "removed", reason: "Misleading" } } } });
    expect(await moderate(v.id, id, { action: "remove", reason: "Second click" })).toMatchObject({ status: 200, body: { post: { status: "removed", moderation: { reason: "Misleading" } } } });
    expect(await moderate(v.id, id, { action: "unpublish", reason: "Too late" })).toMatchObject({ status: 403, body: { reason: "POST_REMOVED" } });
    const log = await audit(id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ action: "SHOP_POST_REMOVED", performedBy: ADMIN_ID, before: { status: "published", title: "Fake offer" }, after: { status: "removed" }, reason: "Misleading" });
    // A draft can be removed too.
    expect(await moderate(v.id, draft, { action: "remove", reason: "Not allowed" })).toMatchObject({ status: 200, body: { post: { status: "removed" } } });

    auth.session = v.session;
    expect(await update(id, { status: "published" })).toMatchObject({ status: 403, body: { reason: "POST_REMOVED" } });
    expect(await remove(id)).toMatchObject({ status: 200 });
  });

  it("requires a reason and a known action, and changes nothing without them", async () => {
    const v = await makeVendor();
    const id = await seedPost(v.shopId, { status: "published" });
    auth.session = admin;
    const cases: [unknown, string][] = [
      [{ action: "remove" }, "REASON_REQUIRED"],
      [{ action: "remove", reason: "   " }, "REASON_REQUIRED"],
      [{ action: "unpublish", reason: 5 }, "REASON_REQUIRED"],
      [{ action: "remove", reason: "x".repeat(501) }, "REASON_TOO_LONG"],
      [{ action: "delete", reason: "Because" }, "ACTION"],
      [{ reason: "Because" }, "ACTION"],
    ];
    for (const [body, reason] of cases) {
      expect(await moderate(v.id, id, body), reason).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR", reason } });
    }
    expect(await moderate(v.id, id, "not json")).toMatchObject({ status: 400 });
    expect(await stored(id)).toMatchObject({ status: "published" });
    expect(await stored(id)).not.toHaveProperty("moderation");
    expect(await audit(id)).toEqual([]);
  });

  it("404s for an unknown post, and for a post reached through another shop", async () => {
    const v = await makeVendor();
    const other = await makeVendor();
    const id = await seedPost(v.shopId, { status: "published" });
    auth.session = admin;
    const body = { action: "remove", reason: "Because" };
    expect(await moderate(other.id, id, body)).toMatchObject({ status: 404, body: { code: "NOT_FOUND" } });
    expect(await moderate(v.id, String(oid()), body)).toMatchObject({ status: 404 });
    expect(await moderate(v.id, "not-an-id", body)).toMatchObject({ status: 404 });
    expect(await stored(id)).toMatchObject({ status: "published" });
    expect(await audit(id)).toEqual([]);
  });
});

describe("public shop page and the subscription sweep", () => {
  it("shows only published posts that are not hidden for an expired subscription", async () => {
    const { getShopPageData } = await import("@/lib/shop-page");
    const v = await makeVendor({ storeType: "services" });
    const at = (ago: number) => new Date(Date.now() - ago * 1000);
    await seedPost(v.shopId, { title: "Visible", status: "published", createdAt: at(1) });
    await seedPost(v.shopId, { title: "Hidden by the sweep", status: "published", hiddenBySubscription: true, createdAt: at(2) });
    await seedPost(v.shopId, { title: "Draft", status: "draft", createdAt: at(3) });
    await seedPost(v.shopId, { title: "Unpublished by admin", status: "draft", moderation: { action: "unpublished", reason: "R", at: new Date() }, createdAt: at(4) });
    await seedPost(v.shopId, { title: "Removed by admin", status: "removed", moderation: { action: "removed", reason: "R", at: new Date() }, createdAt: at(5) });

    const data = await getShopPageData(v.slug);
    expect(data?.posts.map((p) => p.title)).toEqual(["Visible"]);
  });

  it("the sweep hides a long-expired shop's posts with its products, and leaves other shops alone", async () => {
    const { GET: sweep } = await import("@/app/api/cron/vendor-subscription-sweep/route");
    const { getShopPageData } = await import("@/lib/shop-page");
    const expired = await makeVendor({ storeType: "both", expiredDaysAgo: 40 });
    const active = await makeVendor({ storeType: "services" });
    await seedPost(expired.shopId, { title: "Live", status: "published" });
    await seedPost(expired.shopId, { title: "Draft", status: "draft" });
    await db.collection("products").insertOne({ name: "P", slug: `p-${seq}`, price: 1, shopId: expired.shopId, isActive: true, hiddenBySubscription: false });
    const untouched = await seedPost(active.shopId, { title: "Still live", status: "published" });

    expect((await call(sweep, "/api/cron/vendor-subscription-sweep")).status).toBe(200);

    expect(await db.collection("shopposts").countDocuments({ shopId: expired.shopId, hiddenBySubscription: true })).toBe(2);
    expect(await db.collection("products").countDocuments({ shopId: expired.shopId, hiddenBySubscription: true })).toBe(1);
    expect(await stored(untouched)).toMatchObject({ hiddenBySubscription: false });
    expect((await getShopPageData(expired.slug))?.posts).toEqual([]);
    expect((await getShopPageData(active.slug))?.posts.map((p) => p.title)).toEqual(["Still live"]);

    const hideLog = await db.collection("auditlogs").find({ action: "SUBSCRIPTION_STOREFRONT_HIDE", shopId: expired.shopId }).toArray();
    expect(hideLog).toHaveLength(1);
    expect(hideLog[0].metadata).toMatchObject({ productsHidden: 1, postsHidden: 2 });

    // A second run has nothing left to hide and logs nothing new for the shop.
    await call(sweep, "/api/cron/vendor-subscription-sweep");
    expect(await db.collection("auditlogs").countDocuments({ action: "SUBSCRIPTION_STOREFRONT_HIDE", shopId: expired.shopId })).toBe(1);
  });

  it("the sweep also hides a Services shop that has posts but no products", async () => {
    const { GET: sweep } = await import("@/app/api/cron/vendor-subscription-sweep/route");
    const v = await makeVendor({ storeType: "services", expiredDaysAgo: 45 });
    await seedPost(v.shopId, { status: "published" });
    await call(sweep, "/api/cron/vendor-subscription-sweep");
    expect(await db.collection("shopposts").countDocuments({ shopId: v.shopId, hiddenBySubscription: true })).toBe(1);
    const hideLog = await db.collection("auditlogs").findOne({ action: "SUBSCRIPTION_STOREFRONT_HIDE", shopId: v.shopId });
    expect(hideLog?.metadata).toMatchObject({ productsHidden: 0, postsHidden: 1 });
  });
});
