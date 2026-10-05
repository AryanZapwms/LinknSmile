// Vendor subscription renewal through SubscriptionCheckout: web create-order
// writes the record, and the Razorpay webhook or the browser verify (whichever
// is first) renews exactly once. Razorpay and nodemailer are mocked.

import crypto from "crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
const rzp = vi.hoisted(() => ({ payments: new Map<string, any>(), seq: 0 }));
vi.mock("razorpay", () => ({
  default: class {
    orders = { create: async (o: any) => ({ id: `order_S${++rzp.seq}`, amount: o.amount, currency: o.currency }) };
    payments = {
      fetch: async (id: string) => {
        const p = rzp.payments.get(id);
        if (!p) throw new Error("not found");
        return p;
      },
    };
  },
}));
vi.mock("nodemailer", () => {
  const t = { createTransport: () => ({ sendMail: async () => ({ messageId: "t" }) }) };
  return { default: t, ...t };
});

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
const R: Record<string, any> = {};
const DAY = 24 * 60 * 60 * 1000;
let n = 0;

async function makeVendor() {
  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  n++;
  await db.collection("users").insertOne({ _id: userId, email: `sv${n}@e.com`, name: "SV", role: "shop_owner", isActive: true, shopId });
  await db.collection("shops").insertOne({ _id: shopId, ownerId: userId, shopName: `Sub Shop ${n}`, slug: `sub-${n}` });
  // Blocked: expired 20 days ago; one product hidden by the sweep.
  await db.collection("vendorsubscriptions").insertOne({ shopId, status: "expired", expiryDate: new Date(Date.now() - 20 * DAY), amount: 999, currency: "INR", paymentHistory: [], source: "paid" });
  await db.collection("products").insertOne({ name: "P", slug: `p-${n}`, price: 1, shopId, hiddenBySubscription: true, isActive: true });
  auth.session = { user: { id: String(userId), email: `sv${n}@e.com`, name: "SV", role: "shop_owner", shopId: String(shopId) } };
  return { userId, shopId };
}
const createOrder = async () => (await call(R.create.POST, "/api/vendor/subscription/create-order", { method: "POST" })).body;
const pay = (id: string, orderId: string, over: Record<string, unknown> = {}) =>
  rzp.payments.set(id, { id, order_id: orderId, status: "captured", amount: 99900, currency: "INR", ...over });
const captured = (orderId: string, paymentId: string) =>
  JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: 99900, currency: "INR", status: "captured" } } } });
const hook = (orderId: string, paymentId: string) => {
  const body = captured(orderId, paymentId);
  const sig = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest("hex");
  return call(R.webhook.POST, "/api/razorpay/webhook", { body, headers: { "x-razorpay-signature": sig } });
};
const verify = (orderId: string, paymentId: string) => {
  const sig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return call(R.verify.POST, "/api/vendor/subscription/verify-payment", { body: { razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: sig } });
};
const subOf = (shopId: mongoose.Types.ObjectId) => db.collection("vendorsubscriptions").findOne({ shopId });

beforeAll(async () => {
  db = await startTestDb();
  R.create = await import("@/app/api/vendor/subscription/create-order/route");
  R.verify = await import("@/app/api/vendor/subscription/verify-payment/route");
  R.webhook = await import("@/app/api/razorpay/webhook/route");
  await import("@/lib/models/vendor-subscription");
  await import("@/lib/models/vendor-subscription-settings");
  await import("@/lib/models/subscription-checkout");
  await import("@/lib/models/product");
  await initModels();
  await db.collection("vendorsubscriptionsettings").insertOne({ annualFeeAmount: 999, currency: "INR" });
});
afterAll(stopTestDb);
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("subscription renewal via SubscriptionCheckout", () => {
  it("pay and close the tab: the webhook alone renews, unhides products; a later verify gets the same result", async () => {
    const v = await makeVendor();
    const order = await createOrder();
    const checkout = await db.collection("subscriptioncheckouts").findOne({ razorpayOrderId: order.id });
    expect(checkout).toMatchObject({ shopId: v.shopId, amount: 999, amountMinor: 99900, currency: "INR", status: "created" });
    expect(checkout?.expiresAt).toBeInstanceOf(Date);

    pay("pay_tab_closed", order.id);
    const h = await hook(order.id, "pay_tab_closed");
    expect(h).toMatchObject({ status: 200, body: { alreadyDone: false, subscriptionId: expect.any(String) } });

    const sub = await subOf(v.shopId);
    expect(sub?.status).toBe("active");
    expect(new Date(sub!.expiryDate).getTime()).toBeGreaterThan(Date.now() + 364 * DAY);
    expect(sub?.paymentHistory).toHaveLength(1);
    expect(await db.collection("products").countDocuments({ shopId: v.shopId, hiddenBySubscription: true })).toBe(0);
    const done = await db.collection("subscriptioncheckouts").findOne({ razorpayOrderId: order.id });
    expect(done).toMatchObject({ status: "fulfilled", razorpayPaymentId: "pay_tab_closed" });
    expect(done?.expiresAt).toBeUndefined();

    const later = await verify(order.id, "pay_tab_closed");
    expect(later).toMatchObject({ status: 200, body: { success: true, subscriptionId: h.body.subscriptionId } });
    expect((await hook(order.id, "pay_tab_closed")).body).toMatchObject({ alreadyDone: true });
    expect((await subOf(v.shopId))?.paymentHistory).toHaveLength(1);
  });

  it("verify and webhook at the same time renew exactly once; the browser never sees in_progress", async () => {
    const v = await makeVendor();
    const order = await createOrder();
    pay("pay_race_sub", order.id);
    const [a, b, c] = await Promise.all([verify(order.id, "pay_race_sub"), hook(order.id, "pay_race_sub"), verify(order.id, "pay_race_sub")]);
    expect(a).toMatchObject({ status: 200, body: { success: true } });
    expect(c).toMatchObject({ status: 200, body: { success: true } });
    expect([200, 503]).toContain(b.status);
    expect((await subOf(v.shopId))?.paymentHistory).toHaveLength(1);
  });

  it("renewal started twice, first order paid: still renewed (checkout record, not latest order id)", async () => {
    const v = await makeVendor();
    const first = await createOrder();
    const second = await createOrder();
    expect((await subOf(v.shopId))?.razorpayOrderId).toBe(second.id);
    pay("pay_first", first.id);
    expect((await hook(first.id, "pay_first")).status).toBe(200);
    expect((await subOf(v.shopId))?.status).toBe("active");
  });

  it("amount mismatch or another shop's order: not renewed", async () => {
    const v = await makeVendor();
    const order = await createOrder();
    pay("pay_short", order.id, { amount: 100 });
    expect(await hook(order.id, "pay_short")).toMatchObject({ status: 200, body: { outcome: "amount_mismatch" } });
    // create-order marks it "pending" (existing behaviour); it must not become active.
    expect((await subOf(v.shopId))?.status).toBe("pending");
    expect((await subOf(v.shopId))?.paymentHistory).toHaveLength(0);
    expect((await db.collection("subscriptioncheckouts").findOne({ razorpayOrderId: order.id }))?.status).toBe("rejected");

    const victim = await makeVendor();
    const victimOrder = await createOrder();
    pay("pay_victim", victimOrder.id);
    await makeVendor(); // session is now a different vendor
    expect(await verify(victimOrder.id, "pay_victim")).toMatchObject({ status: 403 });
    expect((await subOf(victim.shopId))?.paymentHistory).toHaveLength(0);
  });

  it("legacy renewal (no checkout record): verify keeps the old path, webhook still ignores it", async () => {
    const v = await makeVendor();
    await db.collection("vendorsubscriptions").updateOne({ shopId: v.shopId }, { $set: { status: "pending", razorpayOrderId: "order_legacy" } });
    pay("pay_legacy", "order_legacy");
    expect(await hook("order_legacy", "pay_legacy")).toMatchObject({ status: 200, body: { ignored: "unknown order" } });
    expect(await verify("order_legacy", "pay_legacy")).toMatchObject({ status: 200, body: { success: true } });
    expect((await subOf(v.shopId))?.status).toBe("active");
  });
});
