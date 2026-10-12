// Order status tracking (lib/order-status-tracking.ts) through the two routes
// that change an order's status, against an in-memory MongoDB:
//   vendor PATCH /api/vendor/orders/:id   and   admin PUT /api/orders/:id.
//
// Checks what is written (statusHistory, deliveredAt, cancelledAt,
// cancelledBy) and, as importantly, what is NOT changed: response bodies,
// the payout record, orders that have none of the new fields.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call, type CallOptions } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("nodemailer", () => {
  const t = { createTransport: () => ({ sendMail: async () => ({ messageId: "t" }) }) };
  return { default: t, ...t };
});

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let vendorRoute: typeof import("@/app/api/vendor/orders/[id]/route");
let adminRoute: typeof import("@/app/api/orders/[id]/route");
let tracking: typeof import("@/lib/order-status-tracking");
let Order: typeof import("@/lib/models/order").Order;

const oid = () => new mongoose.Types.ObjectId();
const people = {
  admin: { _id: oid(), email: "admin@tracking.test", role: "admin", shopId: null as mongoose.Types.ObjectId | null, token: "" },
  seller: { _id: oid(), email: "seller@tracking.test", role: "shop_owner", shopId: oid(), token: "" },
  otherSeller: { _id: oid(), email: "other@tracking.test", role: "shop_owner", shopId: oid(), token: "" },
  customer: { _id: oid(), email: "customer@tracking.test", role: "user", shopId: null, token: "" },
};
const product = oid();
let orderId: mongoose.Types.ObjectId; // a fresh "pending" order for each test

const stored = () => db.collection("orders").findOne({ _id: orderId });
const vendorPatch = (body: unknown, who = people.seller, id = orderId) =>
  call(vendorRoute.PATCH, `/api/vendor/orders/${id}`, { method: "PATCH", bearer: who.token, body, params: { id: String(id) } });
const adminPut = (body: unknown, id: unknown = orderId, opts: CallOptions = {}) =>
  call(adminRoute.PUT, `/api/orders/${id}`, { method: "PUT", bearer: people.admin.token, body, params: { id: String(id) }, ...opts });
const isRecent = (value: unknown) => value instanceof Date && Math.abs(Date.now() - value.getTime()) < 30_000;

beforeAll(async () => {
  db = await startTestDb();
  vendorRoute = await import("@/app/api/vendor/orders/[id]/route");
  adminRoute = await import("@/app/api/orders/[id]/route");
  tracking = await import("@/lib/order-status-tracking");
  ({ Order } = await import("@/lib/models/order"));
  const { signAccessToken } = await import("@/lib/mobile-tokens");
  const { CURRENT_MOU_VERSION } = await import("@/lib/mou-content");
  for (const m of ["vendor-subscription", "vendor-mou-acceptance", "product", "company"]) await import(`@/lib/models/${m}`);
  await initModels();

  for (const person of Object.values(people)) {
    await db.collection("users").insertOne({ _id: person._id, email: person.email, name: "Test", role: person.role, shopId: person.shopId ?? undefined, isActive: true, isVerified: true, pushTokens: [] });
    person.token = signAccessToken({ id: String(person._id), email: person.email, name: "Test", role: person.role as any, shopId: person.shopId ? String(person.shopId) : null }, "test").token;
  }
  // Both sellers may use the selling routes: approved shop, agreement accepted, subscription active.
  for (const s of [people.seller, people.otherSeller]) {
    await db.collection("shops").insertOne({ _id: s.shopId!, ownerId: s._id, shopName: "Shop", slug: `shop-${s._id}`, isApproved: true, isActive: true, address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: s.email } });
    await db.collection("vendormouacceptances").insertOne({ userId: s._id, shopId: s.shopId, mouVersion: CURRENT_MOU_VERSION, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
    await db.collection("vendorsubscriptions").insertOne({ shopId: s.shopId, status: "active", expiryDate: new Date(Date.now() + 90 * 86_400_000), amount: 999, currency: "INR", paymentHistory: [], source: "paid" });
  }
  await db.collection("products").insertOne({ _id: product, name: "Serum", slug: "serum", price: 500, stock: 10, shopId: people.seller.shopId, category: oid(), isActive: true, approvalStatus: "approved" });
});
afterAll(stopTestDb);

beforeEach(async () => {
  orderId = oid();
  // Inserted as an order from before status tracking existed: none of the new fields.
  await db.collection("orders").insertOne({
    _id: orderId, orderNumber: `ORD-${orderId}`, user: people.customer._id, totalAmount: 500,
    paymentMethod: "cod", paymentStatus: "pending", orderStatus: "pending",
    items: [{ product, quantity: 1, price: 500, shopId: people.seller.shopId, shopName: "Shop", vendorEarnings: 450 }],
    vendorPayouts: [{ shopId: people.seller.shopId, amount: 450, status: "pending" }],
    shippingAddress: { name: "Buyer", phone: "9999999999", street: "1 St", city: "Mumbai", state: "MH", pincode: "400001" },
    createdAt: new Date(), updatedAt: new Date(),
  });
});

describe("statusChangeUpdate (the rule)", () => {
  const actor = { userId: String(oid()), role: "admin" };
  const at = new Date("2026-10-08T10:00:00.000Z");

  it("returns nothing when the status is not changing", () => {
    expect(tracking.statusChangeUpdate("shipped", "shipped", actor, at)).toBeNull();
    expect(tracking.statusChangeUpdate("shipped", "", actor, at)).toBeNull();
  });

  it("a change adds one history entry; delivered and cancelled also set their fields", () => {
    expect(tracking.statusChangeUpdate("pending", "processing", actor, at)).toEqual({ $push: { statusHistory: { status: "processing", at, by: actor } } });
    expect(tracking.statusChangeUpdate("shipped", "delivered", actor, at)).toMatchObject({ $set: { deliveredAt: at } });
    expect(tracking.statusChangeUpdate("pending", "cancelled", actor, at)).toMatchObject({ $set: { cancelledAt: at, cancelledBy: actor } });
  });
});

describe("vendor PATCH /api/vendor/orders/:id", () => {
  it("records each change with who made it, in order", async () => {
    for (const orderStatus of ["processing", "shipped", "delivered"]) {
      expect((await vendorPatch({ orderStatus })).status).toBe(200);
    }
    const order = await stored();
    expect(order!.statusHistory.map((e: any) => e.status)).toEqual(["processing", "shipped", "delivered"]);
    for (const entry of order!.statusHistory) {
      expect(entry.by).toEqual({ userId: people.seller._id, role: "shop_owner" });
      expect(isRecent(entry.at)).toBe(true);
    }
    expect(order!.deliveredAt).toEqual(order!.statusHistory[2].at);
    expect(order!.cancelledAt).toBeUndefined();
    expect(order!.cancelledBy).toBeUndefined();
  });

  it("cancelling records cancelledAt and cancelledBy (and still stores the reason)", async () => {
    expect((await vendorPatch({ orderStatus: "cancelled", cancellationReason: " Out of stock " })).status).toBe(200);
    const order = await stored();
    expect(order).toMatchObject({ orderStatus: "cancelled", cancellationReason: "Out of stock", cancelledBy: { userId: people.seller._id, role: "shop_owner" } });
    expect(isRecent(order!.cancelledAt)).toBe(true);
    expect(order!.statusHistory).toHaveLength(1);
    expect(order!.statusHistory[0]).toMatchObject({ status: "cancelled", at: order!.cancelledAt });
    expect(order!.deliveredAt).toBeUndefined();
  });

  it("sending the current status again adds no entry and moves no timestamp", async () => {
    await vendorPatch({ orderStatus: "delivered" });
    const first = await stored();
    expect((await vendorPatch({ orderStatus: "delivered" })).status).toBe(200);
    const second = await stored();
    expect(second!.statusHistory).toHaveLength(1);
    expect(second!.deliveredAt).toEqual(first!.deliveredAt);
  });

  it("a refused update records nothing", async () => {
    await vendorPatch({ orderStatus: "shipped" });
    const refused = [
      await vendorPatch({ orderStatus: "not-a-status" }), // invalid
      await vendorPatch({ orderStatus: "processing" }), // backwards
      await vendorPatch({ orderStatus: "cancelled" }), // no reason given
      await vendorPatch({ orderStatus: "delivered" }, people.otherSeller), // not their order
    ];
    expect(refused.map((r) => r.status)).toEqual([400, 400, 400, 403]);
    const order = await stored();
    expect(order).toMatchObject({ orderStatus: "shipped" });
    expect(order!.statusHistory.map((e: any) => e.status)).toEqual(["shipped"]);
    expect(order!.deliveredAt).toBeUndefined();
    expect(order!.cancelledAt).toBeUndefined();
  });

  it("answers exactly as before, and leaves the payout record alone", async () => {
    const res = await vendorPatch({ orderStatus: "delivered" });
    expect(res.body).toEqual({
      success: true,
      message: "Order status updated to delivered",
      order: { _id: String(orderId), orderStatus: "delivered", cancellationReason: null },
    });
    const order = await stored();
    expect(order!.vendorPayouts).toHaveLength(1);
    expect(order!.vendorPayouts[0]).toMatchObject({ shopId: people.seller.shopId, amount: 450, status: "pending" });
    expect(order!.vendorPayouts[0].deliveredAt).toBeUndefined(); // the payout's own field is not ours to write
  });

  it("still succeeds when the history cannot be written", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const updateOne = vi.spyOn(Order, "updateOne").mockRejectedValueOnce(new Error("database unavailable"));
    try {
      const res = await vendorPatch({ orderStatus: "processing" });
      expect(res).toMatchObject({ status: 200, body: { success: true } });
      expect(await stored()).toMatchObject({ orderStatus: "processing" });
      expect(error).toHaveBeenCalledWith(expect.stringContaining("order-status-tracking"), expect.anything());
    } finally {
      updateOne.mockRestore();
      error.mockRestore();
    }
  });
});

describe("admin PUT /api/orders/:id", () => {
  it("records the change with the admin as the actor", async () => {
    expect((await adminPut({ orderStatus: "processing" })).status).toBe(200);
    const order = await stored();
    expect(order!.statusHistory).toHaveLength(1);
    expect(order!.statusHistory[0]).toMatchObject({ status: "processing", by: { userId: people.admin._id, role: "admin" } });
    expect(isRecent(order!.statusHistory[0].at)).toBe(true);
  });

  it("delivered sets deliveredAt; cancelled sets cancelledAt and cancelledBy", async () => {
    await adminPut({ orderStatus: "delivered" });
    let order = await stored();
    expect(isRecent(order!.deliveredAt)).toBe(true);
    expect(order!.cancelledAt).toBeUndefined();

    await adminPut({ orderStatus: "cancelled" });
    order = await stored();
    expect(isRecent(order!.cancelledAt)).toBe(true);
    expect(order!.cancelledBy).toEqual({ userId: people.admin._id, role: "admin" });
    expect(order!.statusHistory.map((e: any) => e.status)).toEqual(["delivered", "cancelled"]);
  });

  it("a payment-status update, or the same order status again, records nothing", async () => {
    expect((await adminPut({ paymentStatus: "completed" })).status).toBe(200);
    expect((await adminPut({ orderStatus: "pending" })).status).toBe(200);
    const order = await stored();
    expect(order).toMatchObject({ paymentStatus: "completed", orderStatus: "pending" });
    expect(order!.statusHistory).toBeUndefined();
  });

  it("can change both statuses in one request, as before", async () => {
    await adminPut({ orderStatus: "shipped", paymentStatus: "completed" });
    const order = await stored();
    expect(order).toMatchObject({ orderStatus: "shipped", paymentStatus: "completed" });
    expect(order!.statusHistory.map((e: any) => e.status)).toEqual(["shipped"]);
  });

  it("does not return who made the changes, and adds nothing else to the response but the two timestamps", async () => {
    const before = await adminPut({ paymentStatus: "completed" }); // no tracking involved
    const after = await adminPut({ orderStatus: "delivered" });
    expect(after.status).toBe(200);
    expect(after.body).not.toHaveProperty("statusHistory");
    expect(after.body).not.toHaveProperty("cancelledBy");
    const added = Object.keys(after.body).filter((key) => !(key in before.body));
    expect(added).toEqual(["deliveredAt"]);
  });

  it("an order that does not exist is still a 404 and nothing is created", async () => {
    const missing = oid();
    expect((await adminPut({ orderStatus: "shipped" }, missing)).status).toBe(404);
    expect(await db.collection("orders").countDocuments({ _id: missing })).toBe(0);
  });

  it("only admins can use it, as before", async () => {
    const res = await adminPut({ orderStatus: "delivered" }, orderId, { bearer: people.seller.token });
    expect(res.status).toBe(403);
    expect((await stored())!.statusHistory).toBeUndefined();
  });
});

describe("both routes on one order", () => {
  it("the history shows who did what: seller, then admin", async () => {
    await vendorPatch({ orderStatus: "processing" });
    await adminPut({ orderStatus: "shipped" });
    await vendorPatch({ orderStatus: "delivered" });
    const order = await stored();
    expect(order!.statusHistory.map((e: any) => [e.status, e.by.role])).toEqual([
      ["processing", "shop_owner"],
      ["shipped", "admin"],
      ["delivered", "shop_owner"],
    ]);
    const times = order!.statusHistory.map((e: any) => e.at.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times); // oldest first
  });
});

describe("reading orders", () => {
  it("existing responses do not include the history or the canceller", async () => {
    await vendorPatch({ orderStatus: "cancelled", cancellationReason: "Out of stock" });

    const customerView = await call(adminRoute.GET, `/api/orders/${orderId}`, { bearer: people.customer.token, params: { id: String(orderId) } });
    expect(customerView.status).toBe(200);
    expect(customerView.body).toMatchObject({ orderStatus: "cancelled", cancellationReason: "Out of stock" });
    expect(customerView.body).not.toHaveProperty("statusHistory");
    expect(customerView.body).not.toHaveProperty("cancelledBy");
    expect(customerView.body.cancelledAt).toEqual(expect.any(String)); // the timestamp itself is visible

    const sellerView = await call(vendorRoute.GET, `/api/vendor/orders/${orderId}`, { bearer: people.seller.token, params: { id: String(orderId) } });
    expect(sellerView.status).toBe(200);
    expect(JSON.stringify(sellerView.body)).not.toContain("statusHistory");
    expect(JSON.stringify(sellerView.body)).not.toContain("cancelledBy");
  });

  it("the history is there for code that asks for it", async () => {
    await vendorPatch({ orderStatus: "processing" });
    expect((await Order.findById(orderId).lean<any>())!.statusHistory).toBeUndefined();
    const withHistory = await Order.findById(orderId).select("+statusHistory +cancelledBy").lean<any>();
    expect(withHistory!.statusHistory).toHaveLength(1);
  });

  it("a new order is not given an empty history", async () => {
    const created = await Order.create({ orderNumber: `ORD-NEW-${oid()}`, user: people.customer._id, totalAmount: 100 });
    const raw = await db.collection("orders").findOne({ _id: created._id });
    expect(raw).not.toHaveProperty("statusHistory");
    expect(raw).not.toHaveProperty("deliveredAt");
    expect(raw).not.toHaveProperty("cancelledAt");
    expect(raw).not.toHaveProperty("cancelledBy");
  });
});
