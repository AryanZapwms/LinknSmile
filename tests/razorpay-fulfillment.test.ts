// Integration tests for the Razorpay order path: lib/razorpay-fulfillment.ts
// (shared by verify-payment and the webhook), fulfillPaidOrder, pricing and
// the ledger, against an in-memory MongoDB replica set. The Razorpay SDK and
// nodemailer are mocked: no network access.

import crypto from "crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";

// `gate`, when set, holds every payments.fetch until it resolves — used to
// keep one request mid-fulfilment (holding the claim) while another arrives.
const rzp = vi.hoisted(() => ({ payments: new Map<string, any>(), gate: null as Promise<void> | null }));
vi.mock("razorpay", () => ({
  default: class FakeRazorpay {
    payments = {
      fetch: async (id: string) => {
        if (rzp.gate) await rzp.gate;
        const p = rzp.payments.get(id);
        if (!p) throw new Error(`payment ${id} not found`);
        return p;
      },
    };
    orders = {
      create: async () => {
        throw new Error("orders.create is not used in these tests");
      },
    };
  },
}));
vi.mock("nodemailer", () => {
  const transport = { createTransport: () => ({ sendMail: async () => ({ messageId: "test" }) }) };
  return { default: transport, ...transport };
});
// verify-payment route: session is the test buyer.
const auth = vi.hoisted(() => ({ userId: "" }));
vi.mock("next-auth", () => ({
  getServerSession: async () => (auth.userId ? { user: { id: auth.userId } } : null),
}));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let fulfil: typeof import("@/lib/razorpay-fulfillment").fulfilRazorpayCheckout;
let RazorpayCheckout: typeof import("@/lib/models/razorpay-checkout").RazorpayCheckout;
let TTL_MS: number;
let AuditLog: typeof import("@/lib/models/audit-log").AuditLog;
let webhookPOST: typeof import("@/app/api/razorpay/webhook/route").POST;
let verifyPOST: typeof import("@/app/api/razorpay/verify-payment/route").POST;

const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const shopId = new mongoose.Types.ObjectId();
const productId = new mongoose.Types.ObjectId();
const address = {
  name: "Buyer", phone: "9999999999", street: "1 Test St", city: "Mumbai",
  state: "MH", zipCode: "400001", country: "India",
};

beforeAll(async () => {
  db = await startTestDb();
  ({ fulfilRazorpayCheckout: fulfil } = await import("@/lib/razorpay-fulfillment"));
  ({ RazorpayCheckout, RAZORPAY_CHECKOUT_TTL_MS: TTL_MS } = await import("@/lib/models/razorpay-checkout"));
  ({ AuditLog } = await import("@/lib/models/audit-log"));
  ({ POST: webhookPOST } = await import("@/app/api/razorpay/webhook/route"));
  ({ POST: verifyPOST } = await import("@/app/api/razorpay/verify-payment/route"));
  auth.userId = String(userId);
  await import("@/lib/models/order");
  await import("@/lib/models/wallet");
  await import("@/lib/models/ledger");
  await initModels();

  // Raw inserts: only the fields pricing/fulfilment read.
  await db.collection("users").insertOne({ _id: userId, email: "buyer@example.com", name: "Buyer", role: "user", isActive: true });
  await db.collection("shops").insertOne({ _id: shopId, shopName: "Test Shop", commissionRate: 10, ownerId: otherUserId, slug: "test-shop" });
  await db.collection("products").insertOne({
    _id: productId, name: "Widget", slug: "widget", price: 500, stock: 1000, shopId,
    category: new mongoose.Types.ObjectId(), approvalStatus: "approved", isActive: true,
  });
});

afterAll(stopTestDb);

afterEach(() => {
  vi.restoreAllMocks();
});

let seq = 0;
async function makeCheckout(opts: { withAddress?: boolean } = {}) {
  seq++;
  const razorpayOrderId = `order_T${seq}`;
  await RazorpayCheckout.create({
    razorpayOrderId, userId, items: [{ product: String(productId), quantity: 2 }],
    shippingAddress: opts.withAddress === false ? undefined : address,
    amount: 1000, amountMinor: 100000, currency: "INR",
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  return razorpayOrderId;
}
const pay = (id: string, orderId: string, over: Record<string, unknown> = {}) =>
  rzp.payments.set(id, { id, order_id: orderId, status: "captured", amount: 100000, currency: "INR", ...over });
const ordersFor = (paymentId: string) => db.collection("orders").countDocuments({ razorpayPaymentId: paymentId });
async function salesFor(paymentId: string) {
  const order = await db.collection("orders").findOne({ razorpayPaymentId: paymentId });
  return order ? db.collection("ledgerentries").countDocuments({ referenceId: String(order._id), type: "SALE" }) : 0;
}
const sign = (body: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET!) =>
  crypto.createHmac("sha256", secret).update(body).digest("hex");
const capturedEvent = (orderId: string, paymentId: string) =>
  JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: 100000, currency: "INR", status: "captured" } } },
  });
async function hook(body: string, signature: string | null) {
  const res = await webhookPOST(
    new Request("http://localhost/api/razorpay/webhook", {
      method: "POST",
      body,
      headers: signature ? { "x-razorpay-signature": signature } : {},
    }) as any
  );
  return { status: res.status, body: await res.json() };
}
const verify = (orderId: string, paymentId: string, extra: Record<string, unknown> = {}) =>
  fulfil({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, source: "verify", expectedUserId: String(userId), shippingAddress: address, ...extra });
// The real browser endpoint. A fresh IP per call keeps paymentLimiter out of the way.
let ipSeq = 0;
async function verifyRoute(orderId: string, paymentId: string) {
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const res = await verifyPOST(
    new Request("http://localhost/api/razorpay/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${++ipSeq}` },
      body: JSON.stringify({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature, shippingAddress: address }),
    }) as any
  );
  return { status: res.status, body: await res.json() };
}
async function waitForStatus(razorpayOrderId: string, status: string) {
  for (let i = 0; i < 200; i++) {
    if ((await RazorpayCheckout.findOne({ razorpayOrderId }).lean<any>())?.status === status) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`checkout ${razorpayOrderId} never reached ${status}`);
}

describe("RazorpayCheckout model", () => {
  it("has the unique and TTL indexes", async () => {
    const indexes = await RazorpayCheckout.collection.indexes();
    expect(indexes.find((i: any) => i.key.expiresAt === 1)?.expireAfterSeconds).toBe(0);
    expect(indexes.find((i: any) => i.key.razorpayOrderId === 1)?.unique).toBe(true);
    expect(indexes.find((i: any) => i.key.razorpayPaymentId === 1)).toMatchObject({ unique: true, sparse: true });
  });
});

describe("idempotency across browser verify and webhook", () => {
  it("verify + webhook + replays at the same time create exactly one order and one ledger sale", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const orderId = await makeCheckout();
    pay("pay_race", orderId);
    const body = capturedEvent(orderId, "pay_race");

    const results = await Promise.all([
      verify(orderId, "pay_race"),
      hook(body, sign(body)),
      verify(orderId, "pay_race"),
      fulfil({ razorpayOrderId: orderId, razorpayPaymentId: "pay_race", source: "webhook" }),
      hook(body, sign(body)),
    ]);

    expect(await ordersFor("pay_race")).toBe(1);
    expect(await salesFor("pay_race")).toBe(1);
    const doc = await RazorpayCheckout.findOne({ razorpayOrderId: orderId }).lean<any>();
    expect(doc.status).toBe("fulfilled");
    expect(doc.expiresAt).toBeUndefined();
    // Browser verifies never surface in_progress: whichever loses the claim
    // waits and gets the winner's order. Webhook losers may get 503 (Razorpay retries).
    const [v1, h1, v2, w, h2] = results as any[];
    for (const v of [v1, v2]) {
      expect(v).toMatchObject({ kind: "fulfilled", orderId: String(doc.orderId) });
    }
    expect(["fulfilled", "in_progress"]).toContain(w.kind);
    for (const h of [h1, h2]) expect([200, 503]).toContain(h.status);

    // Replays after fulfilment return the same order.
    const again = await verify(orderId, "pay_race");
    expect(again).toEqual({ kind: "fulfilled", orderId: String(doc.orderId), alreadyDone: true });
    const replay = await hook(body, sign(body));
    expect(replay).toMatchObject({ status: 200, body: { alreadyDone: true } });
    expect(await ordersFor("pay_race")).toBe(1);
    expect(await salesFor("pay_race")).toBe(1);
  });

  it("webhook first (tab closed), browser verify later: same order, stored address, server total", async () => {
    const orderId = await makeCheckout();
    pay("pay_hook_first", orderId);
    const body = capturedEvent(orderId, "pay_hook_first");
    const first = await hook(body, sign(body));
    expect(first.status).toBe(200);
    expect(first.body.orderId).toBeTruthy();

    const later = await verify(orderId, "pay_hook_first");
    expect(later).toMatchObject({ kind: "fulfilled", orderId: first.body.orderId });
    const order = await db.collection("orders").findOne({ razorpayPaymentId: "pay_hook_first" });
    expect(order?.shippingAddress?.street).toBe("1 Test St");
    expect(order?.totalAmount).toBe(1000);
  });

  it("verify-payment route after the webhook already fulfilled: 200 with the webhook's orderId", async () => {
    const orderId = await makeCheckout();
    pay("pay_route_after", orderId);
    const body = capturedEvent(orderId, "pay_route_after");
    const first = await hook(body, sign(body));
    expect(first).toMatchObject({ status: 200, body: { alreadyDone: false } });

    const res = await verifyRoute(orderId, "pay_route_after");
    expect(res).toEqual({ status: 200, body: { success: true, orderId: first.body.orderId } });
    expect(await ordersFor("pay_route_after")).toBe(1);
    expect(await salesFor("pay_route_after")).toBe(1);
  });

  it("verify-payment route while the webhook holds the claim: waits, then 200 with the webhook's orderId (not 409)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const orderId = await makeCheckout();
    pay("pay_route_race", orderId);
    const body = capturedEvent(orderId, "pay_route_race");

    let open!: () => void;
    rzp.gate = new Promise<void>((r) => (open = r));
    try {
      const webhook = hook(body, sign(body)); // claims, then blocks in payments.fetch
      await waitForStatus(orderId, "processing");
      const browser = verifyRoute(orderId, "pay_route_race");
      await new Promise((r) => setTimeout(r, 700)); // browser is now polling the held claim
      open();

      const [h, v] = await Promise.all([webhook, browser]);
      expect(h).toMatchObject({ status: 200, body: { alreadyDone: false } });
      expect(v).toEqual({ status: 200, body: { success: true, orderId: h.body.orderId } });
    } finally {
      rzp.gate = null;
      open?.();
    }
    expect(await ordersFor("pay_route_race")).toBe(1);
    expect(await salesFor("pay_route_race")).toBe(1);
  });
});

describe("webhook authentication and routing", () => {
  it("rejects bad, missing or tampered signatures, and fails closed without a secret", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = capturedEvent("order_x", "pay_x");
    expect((await hook(body, sign(body, "wrong-secret"))).status).toBe(401);
    expect((await hook(body, null)).status).toBe(401);
    expect((await hook(body.replace("100000", "1"), sign(body))).status).toBe(401);

    const saved = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      expect((await hook(body, sign(body, saved))).status).toBe(503);
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = saved;
    }
  });

  it("acknowledges unknown orders (vendor subscriptions) and other events with 200, creating nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const body = capturedEvent("order_SUBSCRIPTION", "pay_sub");
    expect(await hook(body, sign(body))).toMatchObject({ status: 200, body: { ignored: "unknown order" } });
    expect(await ordersFor("pay_sub")).toBe(0);
    const other = JSON.stringify({ event: "refund.created", payload: {} });
    expect((await hook(other, sign(other))).status).toBe(200);
  });
});

describe("payment checks", () => {
  it("not captured: releases the claim (no expiry, lastPaymentId kept) and succeeds on retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const orderId = await makeCheckout();
    pay("pay_late", orderId, { status: "failed" });
    expect(await fulfil({ razorpayOrderId: orderId, razorpayPaymentId: "pay_late", source: "webhook" })).toEqual({ kind: "not_captured" });
    const doc = await RazorpayCheckout.findOne({ razorpayOrderId: orderId }).lean<any>();
    expect(doc).toMatchObject({ status: "created", lastPaymentId: "pay_late" });
    expect(doc.expiresAt).toBeUndefined();
    expect(doc.razorpayPaymentId).toBeUndefined();

    pay("pay_late", orderId);
    expect(await fulfil({ razorpayOrderId: orderId, razorpayPaymentId: "pay_late", source: "webhook" })).toMatchObject({ kind: "fulfilled" });
    expect(await ordersFor("pay_late")).toBe(1);
  });

  it("amount mismatch, price change and wrong user create no order; rejected records are kept", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const a = await makeCheckout();
    pay("pay_amount", a, { amount: 100 });
    expect(await fulfil({ razorpayOrderId: a, razorpayPaymentId: "pay_amount", source: "webhook" })).toEqual({ kind: "amount_mismatch" });
    expect(await ordersFor("pay_amount")).toBe(0);

    const b = await makeCheckout();
    pay("pay_price", b);
    await db.collection("products").updateOne({ _id: productId }, { $set: { price: 600 } });
    try {
      expect(await fulfil({ razorpayOrderId: b, razorpayPaymentId: "pay_price", source: "webhook" })).toEqual({
        kind: "refund_required",
        reason: "price_changed",
      });
    } finally {
      await db.collection("products").updateOne({ _id: productId }, { $set: { price: 500 } });
    }
    expect(await ordersFor("pay_price")).toBe(0);
    const rejected = await RazorpayCheckout.findOne({ razorpayOrderId: b }).lean<any>();
    expect(rejected.status).toBe("rejected");
    expect(rejected.expiresAt).toBeUndefined();

    const c = await makeCheckout();
    pay("pay_user", c);
    expect(await verify(c, "pay_user", { expectedUserId: String(otherUserId) })).toEqual({ kind: "user_mismatch" });
    expect(await ordersFor("pay_user")).toBe(0);
  });

  it("checkout without a stored address: webhook releases it, browser verify completes it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const orderId = await makeCheckout({ withAddress: false });
    pay("pay_noaddr", orderId);
    expect(await fulfil({ razorpayOrderId: orderId, razorpayPaymentId: "pay_noaddr", source: "webhook" })).toEqual({ kind: "missing_address" });
    expect((await RazorpayCheckout.findOne({ razorpayOrderId: orderId }).lean<any>()).status).toBe("created");
    expect(await verify(orderId, "pay_noaddr")).toMatchObject({ kind: "fulfilled" });
  });
});

describe("ledger audit-log failure during a real order", () => {
  it("still records the sale; logs AUDIT_LOG_WRITE_FAILED, not a generic ledger failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("audit-log write failed (test)"));
    const orderId = await makeCheckout();
    pay("pay_audit", orderId);

    expect(await verify(orderId, "pay_audit")).toMatchObject({ kind: "fulfilled", alreadyDone: false });
    expect(await ordersFor("pay_audit")).toBe(1);
    expect(await salesFor("pay_audit")).toBe(1);

    const logged = errorSpy.mock.calls.map((c) => String(c[0]));
    expect(logged.some((m) => m.includes("AUDIT_LOG_WRITE_FAILED"))).toBe(true);
    expect(logged.some((m) => m.includes("Ledger recording failed"))).toBe(false);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("Cannot call abortTransaction");
  });
});
