// Deleting a product (admin: DELETE /api/products/:id, vendor:
// DELETE /api/vendor/products/:id) also removes that product's featured
// ("hero") entry and wishlist entries. Orders are never touched.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let adminDelete: typeof import("@/app/api/products/[id]/route").DELETE;
let vendorDelete: typeof import("@/app/api/vendor/products/[id]/route").DELETE;
let signAccessToken: typeof import("@/lib/mobile-tokens").signAccessToken;
let CURRENT_MOU_VERSION: string;

const oid = () => new mongoose.Types.ObjectId();
const DAY = 24 * 60 * 60 * 1000;
const adminSession = { user: { id: String(oid()), email: "admin@example.com", name: "Admin", role: "admin" } };

let seq = 0;
async function makeVendor() {
  const n = ++seq;
  const userId = oid();
  const shopId = oid();
  await db.collection("users").insertOne({ _id: userId, email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", isActive: true, isVerified: true, shopId });
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: userId, shopName: `Shop ${n}`, slug: `shop-${n}`, isApproved: true, isActive: true,
    address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
  });
  await db.collection("vendormouacceptances").insertOne({ userId, shopId, mouVersion: CURRENT_MOU_VERSION, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
  await db.collection("vendorsubscriptions").insertOne({ shopId, paymentHistory: [], amount: 999, currency: "INR", status: "active", expiryDate: new Date(Date.now() + 30 * DAY) });
  const user = { id: String(userId), email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", shopId: String(shopId) };
  return { shopId, bearer: signAccessToken(user, "fam").token };
}

/** A product with a featured entry, two wishlist entries and one order line. */
async function makeProduct(shopId = oid()) {
  const productId = oid();
  const n = ++seq;
  await db.collection("products").insertOne({ _id: productId, name: `Product ${n}`, slug: `product-${n}`, price: 100, shopId });
  await db.collection("heroproducts").insertOne({ productId, sortOrder: n, isActive: true });
  await db.collection("wishlists").insertMany([{ userId: oid(), productId }, { userId: oid(), productId }]);
  const { insertedId: orderId } = await db.collection("orders").insertOne({
    orderNumber: `ORD-PD${n}`, user: oid(), orderStatus: "delivered", totalAmount: 100,
    items: [{ product: productId, quantity: 1, price: 100, shopId }],
  });
  return { productId, orderId };
}
const refs = async (productId: mongoose.Types.ObjectId) => ({
  product: await db.collection("products").countDocuments({ _id: productId }),
  hero: await db.collection("heroproducts").countDocuments({ productId }),
  wishlist: await db.collection("wishlists").countDocuments({ productId }),
});

beforeAll(async () => {
  db = await startTestDb();
  ({ signAccessToken } = await import("@/lib/mobile-tokens"));
  ({ CURRENT_MOU_VERSION } = await import("@/lib/mou-content"));
  ({ DELETE: adminDelete } = await import("@/app/api/products/[id]/route"));
  ({ DELETE: vendorDelete } = await import("@/app/api/vendor/products/[id]/route"));
  await import("@/lib/models/vendor-subscription-settings");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(() => {
  auth.session = null;
});

describe("product deletion cleans up featured and wishlist entries", () => {
  it("admin delete: removes that product's entries only, keeps the order, and can be repeated", async () => {
    const gone = await makeProduct();
    const kept = await makeProduct();
    auth.session = adminSession;
    const del = () => call(adminDelete, `/api/products/${gone.productId}`, { method: "DELETE", params: { id: String(gone.productId) } });

    expect(await del()).toMatchObject({ status: 200, body: { message: "Product deleted successfully" } });
    expect(await refs(gone.productId)).toEqual({ product: 0, hero: 0, wishlist: 0 });
    expect(await refs(kept.productId)).toEqual({ product: 1, hero: 1, wishlist: 2 });

    // Order history is preserved: the line still names the deleted product.
    const order = await db.collection("orders").findOne({ _id: gone.orderId });
    expect(String(order?.items[0].product)).toBe(String(gone.productId));

    // A repeat is a plain 404 and touches nothing else.
    expect(await del()).toMatchObject({ status: 404 });
    expect(await refs(kept.productId)).toEqual({ product: 1, hero: 1, wishlist: 2 });
  });

  it("admin delete: a non-admin deletes nothing", async () => {
    const p = await makeProduct();
    auth.session = { user: { id: String(oid()), email: "u@example.com", name: "U", role: "user" } };
    expect(await call(adminDelete, `/api/products/${p.productId}`, { method: "DELETE", params: { id: String(p.productId) } })).toMatchObject({ status: 403 });
    expect(await refs(p.productId)).toEqual({ product: 1, hero: 1, wishlist: 2 });
  });

  it("vendor delete: removes the entries of the vendor's own product, and nothing for someone else's", async () => {
    const vendor = await makeVendor();
    const own = await makeProduct(vendor.shopId);
    const foreign = await makeProduct();
    const del = (id: mongoose.Types.ObjectId) =>
      call(vendorDelete, `/api/vendor/products/${id}`, { method: "DELETE", bearer: vendor.bearer, params: { id: String(id) } });

    expect(await del(foreign.productId)).toMatchObject({ status: 403 });
    expect(await refs(foreign.productId)).toEqual({ product: 1, hero: 1, wishlist: 2 });

    expect(await del(own.productId)).toMatchObject({ status: 200, body: { success: true } });
    expect(await refs(own.productId)).toEqual({ product: 0, hero: 0, wishlist: 0 });
    expect(await db.collection("orders").countDocuments({ _id: own.orderId })).toBe(1);
  });
});
