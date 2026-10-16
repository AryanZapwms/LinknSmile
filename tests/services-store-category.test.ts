// A shop's /services category is chosen on the Store Page: by the vendor
// (PUT /api/vendor/storefront) or an admin (PUT /api/admin/vendors/[id]/storefront).
// The list to choose from is GET /api/services/categories.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let vendorRoute: typeof import("@/app/api/vendor/storefront/route");
let adminRoute: typeof import("@/app/api/admin/vendors/[id]/storefront/route");
let categoriesRoute: typeof import("@/app/api/services/categories/route");
let CURRENT_MOU_VERSION: string;

const oid = () => new mongoose.Types.ObjectId();
const admin = { user: { id: String(oid()), email: "admin@example.com", name: "Admin", role: "admin" } };
let seq = 0;

async function makeVendor(storeType = "services") {
  const n = ++seq;
  const userId = oid();
  const shopId = oid();
  await db.collection("users").insertOne({ _id: userId, email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", isActive: true, isVerified: true, shopId });
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: userId, shopName: `Shop ${n}`, slug: `shop-${n}`, storeType, description: "", isApproved: true, isActive: true,
    address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
  });
  await db.collection("vendormouacceptances").insertOne({ userId, shopId, mouVersion: CURRENT_MOU_VERSION, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
  return { shopId, session: { user: { id: String(userId), email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", shopId: String(shopId) } } };
}
async function makeCategory(en: string, sortOrder: number, o: { ar?: string; hi?: string } = {}) {
  const _id = oid();
  await db.collection("servicecategories").insertOne({ _id, name: { en, ar: o.ar ?? "", hi: o.hi ?? "" }, slug: en.toLowerCase(), sortOrder, createdAt: new Date(), updatedAt: new Date() });
  return String(_id);
}
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}
const vendorSave = (fields: Record<string, string>) => call(vendorRoute.PUT, "/api/vendor/storefront", { method: "PUT", body: form(fields) });
const adminSave = (shopId: string, fields: Record<string, string>) =>
  call(adminRoute.PUT, `/api/admin/vendors/${shopId}/storefront`, { method: "PUT", body: form(fields), params: { id: shopId } });
const categoryOf = async (shopId: mongoose.Types.ObjectId) => {
  const value = (await db.collection("shops").findOne({ _id: shopId }))?.serviceCategory;
  return value ? String(value) : value;
};

beforeAll(async () => {
  db = await startTestDb();
  await db.createCollection("servicecategories").catch(() => {});
  ({ CURRENT_MOU_VERSION } = await import("@/lib/mou-content"));
  vendorRoute = await import("@/app/api/vendor/storefront/route");
  adminRoute = await import("@/app/api/admin/vendors/[id]/storefront/route");
  categoriesRoute = await import("@/app/api/services/categories/route");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(async () => {
  auth.session = null;
  await db.collection("servicecategories").deleteMany({});
});

describe("GET /api/services/categories", () => {
  it("lists the categories in order with every name, whether or not the Services page is on", async () => {
    const design = await makeCategory("Design", 1, { ar: "التصميم" });
    const photo = await makeCategory("Photography", 0, { ar: "التصوير", hi: "फ़ोटोग्राफ़ी" });
    const res = await call(categoriesRoute.GET, "/api/services/categories");
    expect(res).toMatchObject({ status: 200 });
    expect(res.body.categories).toEqual([
      { _id: photo, name: { en: "Photography", ar: "التصوير", hi: "फ़ोटोग्राफ़ी" }, slug: "photography" },
      { _id: design, name: { en: "Design", ar: "التصميم", hi: "" }, slug: "design" },
    ]);
  });
});

describe("choosing a category on the Store Page", () => {
  it("the vendor sets, changes and clears it", async () => {
    const v = await makeVendor("both");
    const photo = await makeCategory("Photography", 0);
    const design = await makeCategory("Design", 1);
    auth.session = v.session;

    expect(await vendorSave({ serviceCategory: photo })).toMatchObject({ status: 200, body: { success: true, shop: { serviceCategory: photo } } });
    expect(await categoryOf(v.shopId)).toBe(photo);
    expect(await vendorSave({ serviceCategory: design, description: "We design things." })).toMatchObject({ status: 200, body: { shop: { serviceCategory: design, description: "We design things." } } });
    // Saving something else leaves the category alone.
    expect(await vendorSave({ description: "Still design." })).toMatchObject({ status: 200, body: { shop: { serviceCategory: design } } });
    expect(await vendorSave({ serviceCategory: "" })).toMatchObject({ status: 200, body: { shop: { serviceCategory: null } } });
    expect(await categoryOf(v.shopId)).toBeNull();
  });

  it("refuses a category that does not exist, and changes nothing", async () => {
    const v = await makeVendor();
    const photo = await makeCategory("Photography", 0);
    auth.session = v.session;
    await vendorSave({ serviceCategory: photo });
    for (const bad of [String(oid()), "not-an-id"]) {
      expect(await vendorSave({ serviceCategory: bad, description: "Changed" }), bad).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR", field: "serviceCategory", reason: "SERVICE_CATEGORY" } });
    }
    const shop = await db.collection("shops").findOne({ _id: v.shopId });
    expect(String(shop?.serviceCategory)).toBe(photo);
    expect(shop?.description).toBe("");
  });

  it("an admin can change any vendor's category, and it is logged", async () => {
    const v = await makeVendor();
    const photo = await makeCategory("Photography", 0);
    const events = await makeCategory("Events", 1);
    auth.session = v.session;
    await vendorSave({ serviceCategory: photo });

    auth.session = admin;
    expect(await adminSave(String(v.shopId), { serviceCategory: events })).toMatchObject({ status: 200, body: { shop: { serviceCategory: events } } });
    expect(await categoryOf(v.shopId)).toBe(events);
    const log = await db.collection("auditlogs").findOne({ action: "SHOP_STOREFRONT_UPDATED", shopId: v.shopId });
    expect(log).toMatchObject({ performedBy: admin.user.id, before: { serviceCategory: photo }, after: { serviceCategory: events } });
  });
});
