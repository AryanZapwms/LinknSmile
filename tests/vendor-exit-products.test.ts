// After a vendor exits (POST /api/vendor/exit, or deleting a vendor account,
// which runs the same flow) their products leave the storefront at once:
// not listed, no detail page, not orderable.

import crypto from "crypto";
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("nodemailer", () => {
  const t = { createTransport: () => ({ sendMail: async () => ({ messageId: "t" }) }) };
  return { default: t, ...t };
});

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
const R: Record<string, any> = {};
let sign: typeof import("@/lib/mobile-tokens").signAccessToken;
let buyer: string;
const address = { name: "B", phone: "9999999999", street: "1 St", city: "Mumbai", state: "MH", pincode: "400001", country: "India" };

let n = 0;
async function makeVendorWithProduct() {
  n++;
  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  await db.collection("users").insertOne({ _id: userId, email: `x${n}@e.com`, name: "X", role: "shop_owner", shopId, isActive: true, isVerified: true, password: await hash("pw", 4) });
  await db.collection("shops").insertOne({ _id: shopId, ownerId: userId, shopName: `Exit Shop ${n}`, slug: `exit-${n}`, isActive: true, isApproved: true, commissionRate: 10 });
  await db.collection("wallets").insertOne({ shopId, type: "VENDOR", status: "ACTIVE", withdrawableBalance: 0, pendingBalance: 0, frozenBalance: 0, version: 0 });
  await db.collection("products").insertOne({ _id: productId, name: `Exit Product ${n}`, slug: `exit-product-${n}`, price: 100, stock: 10, shopId, isActive: true, approvalStatus: "approved", category: new mongoose.Types.ObjectId() });
  const bearer = sign({ id: String(userId), email: `x${n}@e.com`, name: "X", role: "shop_owner", shopId: String(shopId) }, "f").token;
  return { userId, shopId, productId, bearer };
}

// GET /api/products has a 2-minute per-process response cache; a distinct
// `limit` per call gives a fresh cache key, so this checks the query itself.
// (In production a listing cached just before the exit can show the product
// for up to 2 more minutes; detail and ordering are refused immediately.)
let listLimit = 20;
const listed = async (shopId: mongoose.Types.ObjectId) =>
  (await call(R.list.GET, "/api/products", { query: { shopId: String(shopId), limit: listLimit++ } })).body.products.length;
const detail = (productId: mongoose.Types.ObjectId) =>
  call(R.detail.GET, `/api/products/${productId}`, { params: { id: String(productId) } });
const order = (productId: mongoose.Types.ObjectId) =>
  call(R.orders.POST, "/api/orders", { bearer: buyer, headers: { "X-Idempotency-Key": crypto.randomUUID() }, body: { items: [{ product: String(productId), quantity: 1 }], shippingAddress: address } });

async function expectOffStorefront(productId: mongoose.Types.ObjectId, shopId: mongoose.Types.ObjectId) {
  expect(await listed(shopId)).toBe(0);
  expect((await detail(productId)).status).toBe(404);
  expect(await order(productId)).toMatchObject({ status: 404, body: { error: expect.stringContaining("no longer available") } });
  expect(await db.collection("orders").countDocuments({ "items.product": productId })).toBe(0);
}

beforeAll(async () => {
  db = await startTestDb();
  R.list = await import("@/app/api/products/route");
  R.detail = await import("@/app/api/products/[id]/route");
  R.orders = await import("@/app/api/orders/route");
  R.exit = await import("@/app/api/vendor/exit/route");
  R.me = await import("@/app/api/users/me/route");
  ({ signAccessToken: sign } = await import("@/lib/mobile-tokens"));
  for (const m of ["order", "wallet", "ledger", "payout", "audit-log", "company", "category"]) await import(`@/lib/models/${m}`);
  await initModels();
  const buyerId = new mongoose.Types.ObjectId();
  await db.collection("users").insertOne({ _id: buyerId, email: "buyer@e.com", name: "Buyer", role: "user", isActive: true });
  buyer = sign({ id: String(buyerId), email: "buyer@e.com", name: "Buyer", role: "user", shopId: null }, "f").token;
});
afterAll(stopTestDb);
beforeEach(() => {
  auth.session = null;
});

describe("vendor exit takes the vendor's products off the storefront", () => {
  it("POST /api/vendor/exit: not listed, detail 404, POST /api/orders refused", async () => {
    const v = await makeVendorWithProduct();
    // Before exit: visible and orderable.
    expect(await listed(v.shopId)).toBe(1);
    expect((await detail(v.productId)).status).toBe(200);
    expect((await order(v.productId)).status).toBe(200);

    expect((await call(R.exit.POST, "/api/vendor/exit", { method: "POST", bearer: v.bearer })).status).toBe(200);
    expect(await db.collection("products").countDocuments({ shopId: v.shopId, isActive: true })).toBe(0);
    // The order placed before exit exists; no new one can be placed.
    await db.collection("orders").deleteMany({ "items.product": v.productId });
    await expectOffStorefront(v.productId, v.shopId);

    // Admins can still open it (the admin edit page loads through this route).
    auth.session = { user: { id: "admin", role: "admin" } };
    expect((await detail(v.productId)).status).toBe(200);
  });

  it("deleting a vendor account (runs the same exit flow) has the same effect", async () => {
    const v = await makeVendorWithProduct();
    expect((await call(R.me.DELETE, "/api/users/me", { method: "DELETE", bearer: v.bearer, body: { confirm: "DELETE", password: "pw" } })).status).toBe(200);
    await expectOffStorefront(v.productId, v.shopId);
  });
});
