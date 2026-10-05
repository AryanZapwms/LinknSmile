// Admin payment toggles (PaymentSettings.enableCOD / enableRazorpay) are
// enforced by the order routes, not just hidden in the checkout UI.

import crypto from "crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
const rzp = vi.hoisted(() => ({ payments: new Map<string, any>(), created: 0 }));
vi.mock("razorpay", () => ({
  default: class {
    orders = { create: async (o: any) => ({ id: `order_T${++rzp.created}`, amount: o.amount, currency: o.currency }) };
    payments = { fetch: async (id: string) => rzp.payments.get(id) };
  },
}));
vi.mock("nodemailer", () => {
  const t = { createTransport: () => ({ sendMail: async () => ({ messageId: "t" }) }) };
  return { default: t, ...t };
});

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let orders: typeof import("@/app/api/orders/route").POST;
let createOrder: typeof import("@/app/api/razorpay/create-order/route").POST;
let verify: typeof import("@/app/api/razorpay/verify-payment/route").POST;
let bearer: string;

const userId = new mongoose.Types.ObjectId();
const productId = new mongoose.Types.ObjectId();
const shopId = new mongoose.Types.ObjectId();
const address = { name: "B", phone: "9999999999", street: "1 St", city: "Mumbai", state: "MH", pincode: "400001", country: "India" };
const items = [{ product: String(productId), quantity: 1 }];
const setToggles = (s: { enableCOD?: boolean; enableRazorpay?: boolean }) =>
  db.collection("paymentsettings").updateOne({}, { $set: s }, { upsert: true });

beforeAll(async () => {
  db = await startTestDb();
  ({ POST: orders } = await import("@/app/api/orders/route"));
  ({ POST: createOrder } = await import("@/app/api/razorpay/create-order/route"));
  ({ POST: verify } = await import("@/app/api/razorpay/verify-payment/route"));
  const { signAccessToken } = await import("@/lib/mobile-tokens");
  bearer = signAccessToken({ id: String(userId), email: "t@e.com", name: "T", role: "user", shopId: null }, "f").token;
  for (const m of ["order", "wallet", "ledger", "payment-settings"]) await import(`@/lib/models/${m}`);
  await initModels();
  await db.collection("users").insertOne({ _id: userId, email: "t@e.com", name: "T", role: "user", isActive: true });
  await db.collection("shops").insertOne({ _id: shopId, shopName: "S", slug: "s", commissionRate: 10, ownerId: new mongoose.Types.ObjectId() });
  await db.collection("products").insertOne({ _id: productId, name: "P", slug: "p", price: 500, stock: 100, shopId, isActive: true, approvalStatus: "approved", category: new mongoose.Types.ObjectId() });
});
afterAll(stopTestDb);
afterEach(() => setToggles({ enableCOD: true, enableRazorpay: true }));

const cod = (key = crypto.randomUUID()) =>
  call(orders, "/api/orders", { bearer, headers: { "X-Idempotency-Key": key }, body: { items, shippingAddress: address } });
const rzpOrder = () => call(createOrder, "/api/razorpay/create-order", { bearer, body: { items, shippingAddress: address } });

describe("COD toggle on POST /api/orders", () => {
  it("disabled → 403 PAYMENT_METHOD_DISABLED and no order; enabled (or no settings doc) → order", async () => {
    expect((await cod()).status).toBe(200); // no settings document yet = enabled
    const before = await db.collection("orders").countDocuments();
    await setToggles({ enableCOD: false });
    expect(await cod()).toMatchObject({ status: 403, body: { code: "PAYMENT_METHOD_DISABLED", paymentMethod: "cod" } });
    expect(await db.collection("orders").countDocuments()).toBe(before);
    await setToggles({ enableCOD: true });
    expect((await cod()).status).toBe(200);
  });

  it("a replay of an order placed before COD was disabled still returns that order", async () => {
    const key = crypto.randomUUID();
    const first = await cod(key);
    await setToggles({ enableCOD: false });
    expect(await cod(key)).toMatchObject({ status: 200, body: { orderId: first.body.orderId } });
  });
});

describe("Razorpay toggle on POST /api/razorpay/create-order", () => {
  it("disabled → 403, no Razorpay order and no checkout record", async () => {
    await setToggles({ enableRazorpay: false });
    const created = rzp.created;
    const checkouts = await db.collection("razorpaycheckouts").countDocuments();
    expect(await rzpOrder()).toMatchObject({ status: 403, body: { code: "PAYMENT_METHOD_DISABLED", paymentMethod: "razorpay" } });
    expect(rzp.created).toBe(created);
    expect(await db.collection("razorpaycheckouts").countDocuments()).toBe(checkouts);
    // COD is independent.
    expect((await cod()).status).toBe(200);
  });

  it("a payment captured before online payment was switched off is still fulfilled", async () => {
    const order = (await rzpOrder()).body;
    rzp.payments.set("pay_t", { id: "pay_t", order_id: order.id, status: "captured", amount: order.amount, currency: order.currency });
    await setToggles({ enableRazorpay: false });
    const sig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${order.id}|pay_t`).digest("hex");
    const res = await call(verify, "/api/razorpay/verify-payment", { bearer, body: { razorpayOrderId: order.id, razorpayPaymentId: "pay_t", razorpaySignature: sig } });
    expect(res).toMatchObject({ status: 200, body: { success: true } });
  });
});
