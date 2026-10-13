// Store page editing: PUT /api/vendor/storefront (a vendor's own shop) and
// PUT /api/admin/vendors/[id]/storefront (any shop), against an in-memory
// MongoDB with the image storage provider stubbed out.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
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
let vendorRoute: typeof import("@/app/api/vendor/storefront/route");
let adminRoute: typeof import("@/app/api/admin/vendors/[id]/storefront/route");
let settingsRoute: typeof import("@/app/api/vendor/settings/route");
let CURRENT_MOU_VERSION: string;

const MB = 1024 * 1024;
const ADMIN_ID = String(new mongoose.Types.ObjectId());
const admin = { user: { id: ADMIN_ID, email: "admin@example.com", name: "Admin", role: "admin", shopId: null } };
let seq = 0;

async function makeVendor(o: { mou?: boolean; shop?: Record<string, unknown> } = {}) {
  const n = ++seq;
  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  await db.collection("users").insertOne({ _id: userId, email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", isActive: true, isVerified: true, shopId });
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: userId, shopName: `Shop ${n}`, slug: `shop-${n}`, description: "", isApproved: true, isActive: true,
    address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    ...o.shop,
  });
  if (o.mou ?? true) {
    await db.collection("vendormouacceptances").insertOne({ userId, shopId, mouVersion: CURRENT_MOU_VERSION, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
  }
  const session = { user: { id: String(userId), email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", shopId: String(shopId) } };
  return { shopId, id: String(shopId), session, folder: `link-and-smile/shops/${shopId}` };
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
function form(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const save = (fields: Record<string, string | File>) =>
  call(vendorRoute.PUT, "/api/vendor/storefront", { method: "PUT", body: form(fields) });
const adminSave = (shopId: string, fields: Record<string, string | File>) =>
  call(adminRoute.PUT, `/api/admin/vendors/${shopId}/storefront`, { method: "PUT", body: form(fields), params: { id: shopId } });
const shopDoc = async (shopId: mongoose.Types.ObjectId) => (await db.collection("shops").findOne({ _id: shopId }))!;
const auditRows = (shopId: mongoose.Types.ObjectId) =>
  db.collection("auditlogs").find({ action: "SHOP_STOREFRONT_UPDATED", shopId }).toArray();

beforeAll(async () => {
  db = await startTestDb();
  ({ CURRENT_MOU_VERSION } = await import("@/lib/mou-content"));
  vendorRoute = await import("@/app/api/vendor/storefront/route");
  adminRoute = await import("@/app/api/admin/vendors/[id]/storefront/route");
  settingsRoute = await import("@/app/api/vendor/settings/route");
  await initModels();
});

afterAll(async () => {
  await stopTestDb();
});

beforeEach(() => {
  auth.session = null;
  storage.uploads.length = 0;
  storage.down = false;
});

describe("PUT /api/vendor/storefront", () => {
  it("requires a vendor who has accepted the MOU", async () => {
    const fields = { description: "Should not be saved", logo: image("png") };

    const anonymous = await save(fields);
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.code).toBe("UNAUTHORIZED");

    auth.session = { user: { id: String(new mongoose.Types.ObjectId()), email: "c@example.com", name: "C", role: "user", shopId: null } };
    const customer = await save(fields);
    expect(customer.status).toBe(403);
    expect(customer.body.code).toBe("NOT_VENDOR");

    const vendor = await makeVendor({ mou: false });
    auth.session = vendor.session;
    const noMou = await save(fields);
    expect(noMou.status).toBe(403);
    expect(noMou.body.code).toBe("MOU_REQUIRED");

    expect(storage.uploads).toEqual([]);
    expect((await shopDoc(vendor.shopId)).description).toBe("");
  });

  it("saves the description on its own and leaves the images alone", async () => {
    const vendor = await makeVendor({ shop: { logo: "https://res.cloudinary.com/test/old-logo.png" } });
    auth.session = vendor.session;

    // Browsers send textarea line breaks as CRLF.
    const res = await save({ description: "  Hand-made soaps.\r\nSince 2019.  " });

    expect(res.status).toBe(200);
    expect(res.body.shop).toMatchObject({ _id: vendor.id, slug: expect.any(String), description: "Hand-made soaps.\nSince 2019.", logo: "https://res.cloudinary.com/test/old-logo.png", coverImage: null });
    const shop = await shopDoc(vendor.shopId);
    expect(shop.description).toBe("Hand-made soaps.\nSince 2019.");
    expect(shop.logo).toBe("https://res.cloudinary.com/test/old-logo.png");
    expect(storage.uploads).toEqual([]);
  });

  it("stores a logo and a banner in the shop's own folder and saves their URLs", async () => {
    const vendor = await makeVendor();
    auth.session = vendor.session;

    const res = await save({ logo: image("png", { size: 300 }), banner: image("webp", { size: 500 }) });

    expect(res.status).toBe(200);
    expect(storage.uploads).toEqual([
      { folder: vendor.folder, filename: "logo.png", bytes: 300 },
      { folder: vendor.folder, filename: "banner.webp", bytes: 500 },
    ]);
    const shop = await shopDoc(vendor.shopId);
    expect(shop.logo).toBe(`https://res.cloudinary.com/test/${vendor.folder}/1-logo.png`);
    expect(shop.coverImage).toBe(`https://res.cloudinary.com/test/${vendor.folder}/2-banner.webp`);
    expect(res.body.shop).toMatchObject({ logo: shop.logo, coverImage: shop.coverImage });
  });

  it("goes by a file's content, not its name or declared type", async () => {
    const vendor = await makeVendor();
    auth.session = vendor.session;

    // JPEG bytes that claim to be a PNG are stored as the JPEG they are.
    const jpeg = await save({ logo: image("jpeg", { name: "../../photo.png", type: "image/png" }) });
    expect(jpeg.status).toBe(200);
    expect(storage.uploads).toEqual([{ folder: vendor.folder, filename: "logo.jpg", bytes: 64 }]);
    const savedLogo = (await shopDoc(vendor.shopId)).logo;

    const impostors = {
      gif: image("gif", { name: "logo.png", type: "image/png" }),
      svg: new File(['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'], "logo.png", { type: "image/png" }),
      html: new File(["<!doctype html><script>alert(1)</script>"], "logo.jpg", { type: "image/jpeg" }),
      empty: new File([], "logo.png", { type: "image/png" }),
    };
    for (const [name, file] of Object.entries(impostors)) {
      const res = await save({ logo: file });
      expect(res.status, name).toBe(400);
      expect(res.body, name).toMatchObject({ code: "VALIDATION_ERROR", field: "logo", reason: "IMAGE_TYPE" });
    }

    expect(storage.uploads).toHaveLength(1);
    expect((await shopDoc(vendor.shopId)).logo).toBe(savedLogo);
  });

  it("allows a logo up to 2 MB and a banner up to 5 MB", async () => {
    const vendor = await makeVendor();
    auth.session = vendor.session;

    const atLimit = await save({ logo: image("png", { size: 2 * MB }), banner: image("jpeg", { size: 5 * MB }) });
    expect(atLimit.status).toBe(200);
    expect(storage.uploads.map((u) => u.bytes)).toEqual([2 * MB, 5 * MB]);
    const saved = await shopDoc(vendor.shopId);

    const bigLogo = await save({ logo: image("png", { size: 2 * MB + 1 }) });
    expect(bigLogo.status).toBe(400);
    expect(bigLogo.body).toMatchObject({ code: "VALIDATION_ERROR", field: "logo", reason: "IMAGE_TOO_LARGE" });

    const bigBanner = await save({ banner: image("jpeg", { size: 5 * MB + 1 }) });
    expect(bigBanner.status).toBe(400);
    expect(bigBanner.body).toMatchObject({ code: "VALIDATION_ERROR", field: "banner", reason: "IMAGE_TOO_LARGE" });

    expect(storage.uploads).toHaveLength(2);
    const after = await shopDoc(vendor.shopId);
    expect([after.logo, after.coverImage]).toEqual([saved.logo, saved.coverImage]);
  });

  it("limits the description to 1000 characters", async () => {
    const vendor = await makeVendor();
    auth.session = vendor.session;

    const tooLong = await save({ description: "a".repeat(1001) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body).toMatchObject({ code: "VALIDATION_ERROR", field: "description", reason: "DESCRIPTION_TOO_LONG" });
    expect((await shopDoc(vendor.shopId)).description).toBe("");

    // 1000 characters as the form counts them; the CRLF makes the raw value 1001.
    const atLimit = await save({ description: `${"a".repeat(499)}\r\n${"b".repeat(500)}` });
    expect(atLimit.status).toBe(200);
    expect((await shopDoc(vendor.shopId)).description).toHaveLength(1000);
  });

  it("stores and saves nothing when any part of the request is invalid", async () => {
    const vendor = await makeVendor({ shop: { description: "Original" } });
    auth.session = vendor.session;

    const badBanner = await save({ description: "New text", logo: image("png"), banner: image("gif") });
    expect(badBanner.status).toBe(400);
    expect(badBanner.body.field).toBe("banner");

    const badDescription = await save({ description: "a".repeat(1001), logo: image("png") });
    expect(badDescription.status).toBe(400);
    expect(badDescription.body.field).toBe("description");

    expect(storage.uploads).toEqual([]);
    const shop = await shopDoc(vendor.shopId);
    expect(shop.description).toBe("Original");
    expect(shop.logo).toBeUndefined();
    expect(shop.coverImage).toBeUndefined();
  });

  it("refuses a URL in place of a file", async () => {
    const vendor = await makeVendor();
    auth.session = vendor.session;

    const res = await save({ logo: "https://elsewhere.example/logo.png", banner: "https://elsewhere.example/banner.png" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: "VALIDATION_ERROR", reason: "IMAGE_TYPE" });
    const shop = await shopDoc(vendor.shopId);
    expect(shop.logo).toBeUndefined();
    expect(shop.coverImage).toBeUndefined();
  });

  it("removes an image on request and leaves the other one alone", async () => {
    const vendor = await makeVendor({ shop: { logo: "https://res.cloudinary.com/test/logo.png", coverImage: "https://res.cloudinary.com/test/banner.png" } });
    auth.session = vendor.session;

    const res = await save({ removeLogo: "true" });

    expect(res.status).toBe(200);
    expect(res.body.shop).toMatchObject({ logo: null, coverImage: "https://res.cloudinary.com/test/banner.png" });
    const shop = await shopDoc(vendor.shopId);
    expect(shop.logo).toBeUndefined();
    expect(shop.coverImage).toBe("https://res.cloudinary.com/test/banner.png");
  });

  it("always edits the caller's own shop", async () => {
    const other = await makeVendor({ shop: { description: "Theirs" } });
    const vendor = await makeVendor();
    auth.session = vendor.session;

    const res = await save({ description: "Mine", shopId: other.id, id: other.id, _id: other.id });

    expect(res.status).toBe(200);
    expect(res.body.shop._id).toBe(vendor.id);
    expect((await shopDoc(vendor.shopId)).description).toBe("Mine");
    expect((await shopDoc(other.shopId)).description).toBe("Theirs");
  });

  it("saves nothing when the image can't be stored", async () => {
    const vendor = await makeVendor({ shop: { description: "Original" } });
    auth.session = vendor.session;
    storage.down = true;

    const res = await save({ description: "New text", logo: image("png") });

    expect(res.status).toBe(502);
    expect(res.body.code).toBe("INTERNAL_ERROR");
    const shop = await shopDoc(vendor.shopId);
    expect(shop.description).toBe("Original");
    expect(shop.logo).toBeUndefined();
  });

  it("refuses an oversized body before reading it, and a body that isn't multipart", async () => {
    const vendor = await makeVendor();
    auth.session = vendor.session;

    const oversized = await call(vendorRoute.PUT, "/api/vendor/storefront", {
      method: "PUT",
      body: form({ description: "x" }),
      headers: { "content-length": String(20 * MB) },
    });
    expect(oversized.status).toBe(413);

    const json = await call(vendorRoute.PUT, "/api/vendor/storefront", { method: "PUT", body: { description: "x" } });
    expect(json.status).toBe(400);
    expect(json.body.code).toBe("VALIDATION_ERROR");

    expect((await shopDoc(vendor.shopId)).description).toBe("");
  });
});

describe("PUT /api/vendor/settings", () => {
  it("no longer sets the logo or banner from a URL, and still saves the rest", async () => {
    const vendor = await makeVendor({ shop: { logo: "https://res.cloudinary.com/test/logo.png" } });
    auth.session = vendor.session;

    const res = await call(settingsRoute.PUT, "/api/vendor/settings", {
      method: "PUT",
      body: { shopName: "Renamed", description: "From the app", logo: "https://elsewhere.example/logo.png", coverImage: "https://elsewhere.example/banner.png" },
    });

    expect(res.status).toBe(200);
    const shop = await shopDoc(vendor.shopId);
    expect(shop).toMatchObject({ shopName: "Renamed", description: "From the app", logo: "https://res.cloudinary.com/test/logo.png" });
    expect(shop.coverImage).toBeUndefined();
  });
});

describe("PUT /api/admin/vendors/[id]/storefront", () => {
  it("is admin-only, even for the shop's own vendor", async () => {
    const vendor = await makeVendor();
    const fields = { description: "Should not be saved", logo: image("png") };

    expect((await adminSave(vendor.id, fields)).status).toBe(401);
    auth.session = vendor.session;
    expect((await adminSave(vendor.id, fields)).status).toBe(401);

    expect(storage.uploads).toEqual([]);
    expect((await shopDoc(vendor.shopId)).description).toBe("");
    expect(await auditRows(vendor.shopId)).toEqual([]);
  });

  it("edits any shop and records who changed what", async () => {
    const vendor = await makeVendor({ shop: { description: "Old text", coverImage: "https://res.cloudinary.com/test/banner.png" } });
    auth.session = admin;

    const res = await adminSave(vendor.id, { description: "New text", logo: image("png"), removeBanner: "true" });

    expect(res.status).toBe(200);
    const logo = `https://res.cloudinary.com/test/${vendor.folder}/1-logo.png`;
    expect(res.body.shop).toMatchObject({ _id: vendor.id, description: "New text", logo, coverImage: null });
    const shop = await shopDoc(vendor.shopId);
    expect(shop).toMatchObject({ description: "New text", logo });
    expect(shop.coverImage).toBeUndefined();

    const rows = await auditRows(vendor.shopId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      performedBy: ADMIN_ID,
      targetEntity: "Shop",
      targetId: vendor.shopId,
      before: { description: "Old text", logo: null, coverImage: "https://res.cloudinary.com/test/banner.png" },
      after: { description: "New text", logo, coverImage: null },
    });
  });

  it("records nothing when the save changes nothing", async () => {
    const vendor = await makeVendor({ shop: { description: "Same text" } });
    auth.session = admin;

    const res = await adminSave(vendor.id, { description: "Same text" });

    expect(res.status).toBe(200);
    expect(await auditRows(vendor.shopId)).toEqual([]);
  });

  it("applies the same rules as the vendor route", async () => {
    const vendor = await makeVendor();
    auth.session = admin;

    const res = await adminSave(vendor.id, { logo: image("gif"), description: "New text" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: "VALIDATION_ERROR", field: "logo", reason: "IMAGE_TYPE" });
    expect((await shopDoc(vendor.shopId)).description).toBe("");
    expect(await auditRows(vendor.shopId)).toEqual([]);
  });

  it("returns 404 for an unknown or malformed shop id", async () => {
    auth.session = admin;

    const unknown = await adminSave(String(new mongoose.Types.ObjectId()), { description: "x" });
    expect(unknown.status).toBe(404);
    expect(unknown.body.code).toBe("SHOP_NOT_FOUND");

    const malformed = await adminSave("not-an-id", { description: "x" });
    expect(malformed.status).toBe(404);
  });
});
