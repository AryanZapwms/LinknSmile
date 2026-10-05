// Server-enforced vendor gates (lib/vendor-guard.ts) across real vendor
// routes, for both the mobile Bearer token and the web session, plus the
// iOS rule that mobile cannot pay for a subscription.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
const rzp = vi.hoisted(() => ({ created: 0 }));
vi.mock("razorpay", () => ({
  default: class {
    orders = { create: async (o: any) => ({ id: `order_sub_${++rzp.created}`, amount: o.amount, currency: o.currency }) };
    payments = { fetch: async () => { throw new Error("unused"); } };
  },
}));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let signAccessToken: typeof import("@/lib/mobile-tokens").signAccessToken;
let vendorBlockCode: typeof import("@/lib/vendor-guard").vendorBlockCode;
let CURRENT_MOU_VERSION: string;
const R: Record<string, any> = {};

const DAY = 24 * 60 * 60 * 1000;
let seq = 0;

interface VendorOpts {
  mou?: boolean;
  approved?: boolean;
  sub?: { status: string; expiryDate?: Date } | null;
  role?: string;
  withShop?: boolean;
}
async function makeVendor(o: VendorOpts = {}) {
  const n = ++seq;
  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  await db.collection("users").insertOne({ _id: userId, email: `v${n}@example.com`, name: `V${n}`, role: o.role ?? "shop_owner", isActive: true, isVerified: true, shopId: o.withShop === false ? undefined : shopId });
  if (o.withShop !== false) {
    await db.collection("shops").insertOne({
      _id: shopId, ownerId: userId, shopName: `Shop ${n}`, slug: `shop-${n}`, isApproved: o.approved ?? true, isActive: true,
      address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    });
  }
  if (o.mou ?? true) {
    await db.collection("vendormouacceptances").insertOne({ userId, shopId, mouVersion: CURRENT_MOU_VERSION, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
  }
  const sub = o.sub === undefined ? { status: "active", expiryDate: new Date(Date.now() + 30 * DAY) } : o.sub;
  if (sub) await db.collection("vendorsubscriptions").insertOne({ shopId, paymentHistory: [], amount: 999, currency: "INR", ...sub });
  const user = { id: String(userId), email: `v${n}@example.com`, name: `V${n}`, role: o.role ?? "shop_owner", shopId: o.withShop === false ? null : String(shopId) };
  return { ...user, userId, shopIdObj: shopId, bearer: signAccessToken(user, "fam").token, session: { user } };
}

beforeAll(async () => {
  db = await startTestDb();
  ({ signAccessToken } = await import("@/lib/mobile-tokens"));
  ({ vendorBlockCode } = await import("@/lib/vendor-guard"));
  ({ CURRENT_MOU_VERSION } = await import("@/lib/mou-content"));
  R.orders = await import("@/app/api/vendor/orders/route");
  R.settings = await import("@/app/api/vendor/settings/route");
  R.products = await import("@/app/api/vendor/products/route");
  R.status = await import("@/app/api/vendor/status/route");
  R.mou = await import("@/app/api/vendor/mou/route");
  R.subCreate = await import("@/app/api/vendor/subscription/create-order/route");
  R.subVerify = await import("@/app/api/vendor/subscription/verify-payment/route");
  R.wallet = await import("@/app/api/vendor/wallet/route");
  R.ledger = await import("@/app/api/vendor/wallet/ledger/route");
  R.walletOrders = await import("@/app/api/vendor/wallet/orders/route");
  R.payouts = await import("@/app/api/vendor/payouts/route");
  R.bank = await import("@/app/api/vendor/bank-details/route");
  R.stats = await import("@/app/api/vendor/stats/route");
  for (const m of ["wallet", "ledger", "payout", "audit-log"]) await import(`@/lib/models/${m}`);
  await import("@/lib/models/order");
  await import("@/lib/models/vendor-subscription");
  await import("@/lib/models/vendor-subscription-settings");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(() => {
  auth.session = null;
});

describe("vendorBlockCode (pure)", () => {
  const active = { status: "active", isBlocked: false } as any;
  const blocked = { status: "blocked", isBlocked: true } as any;
  it("checks MOU always, then subscription and approval only when asked", () => {
    const selling = { subscription: true, approval: true };
    expect(vendorBlockCode({ mouAccepted: false, access: blocked, isApproved: false }, selling)).toBe("MOU_REQUIRED");
    expect(vendorBlockCode({ mouAccepted: false, access: active, isApproved: true })).toBe("MOU_REQUIRED");
    expect(vendorBlockCode({ mouAccepted: true, access: blocked, isApproved: false }, selling)).toBe("SUBSCRIPTION_EXPIRED");
    expect(vendorBlockCode({ mouAccepted: true, access: active, isApproved: false }, selling)).toBe("SHOP_PENDING");
    // MOU-only (money routes): an expired subscription or unapproved shop doesn't block.
    expect(vendorBlockCode({ mouAccepted: true, access: blocked, isApproved: false })).toBeNull();
    expect(vendorBlockCode({ mouAccepted: true, access: active, isApproved: true }, selling)).toBeNull();
  });
});

describe("guarded vendor routes", () => {
  const orders = (bearer?: string) => call(R.orders.GET, "/api/vendor/orders", { bearer });
  const settings = (bearer?: string) => call(R.settings.GET, "/api/vendor/settings", { bearer });

  it("fully set-up vendor: approval and standard routes work (Bearer)", async () => {
    const v = await makeVendor();
    expect((await orders(v.bearer)).status).toBe(200);
    expect((await settings(v.bearer)).status).toBe(200);
    expect((await call(R.products.GET, "/api/vendor/products", { bearer: v.bearer })).status).toBe(200);
  });

  it("MOU not accepted → 403 MOU_REQUIRED everywhere guarded, with message for web pages", async () => {
    const v = await makeVendor({ mou: false, sub: null, approved: false });
    const res = await orders(v.bearer);
    expect(res).toMatchObject({ status: 403, body: { code: "MOU_REQUIRED", mouVersion: CURRENT_MOU_VERSION } });
    expect(res.body.message).toBe(res.body.error);
    expect(await settings(v.bearer)).toMatchObject({ status: 403, body: { code: "MOU_REQUIRED" } });
  });

  it("no subscription, cancelled, or >7 days expired → SUBSCRIPTION_EXPIRED on selling routes; grace period passes", async () => {
    for (const sub of [null, { status: "pending" }, { status: "cancelled", expiryDate: new Date(Date.now() + 30 * DAY) }, { status: "active", expiryDate: new Date(Date.now() - 8 * DAY) }]) {
      const v = await makeVendor({ sub });
      expect(await orders(v.bearer)).toMatchObject({ status: 403, body: { code: "SUBSCRIPTION_EXPIRED" } });
      expect(await call(R.products.GET, "/api/vendor/products", { bearer: v.bearer })).toMatchObject({ status: 403, body: { code: "SUBSCRIPTION_EXPIRED" } });
    }
    const grace = await makeVendor({ sub: { status: "active", expiryDate: new Date(Date.now() - 3 * DAY) } });
    expect((await orders(grace.bearer)).status).toBe(200);
    const expired = await makeVendor({ sub: { status: "active", expiryDate: new Date(Date.now() - 8 * DAY) } });
    expect((await orders(expired.bearer)).body).toMatchObject({ subscriptionStatus: "blocked", expiryDate: expect.any(String) });
  });

  it("expired subscription: wallet, ledger, payouts (incl. requesting one), bank details, settings and stats stay open", async () => {
    const v = await makeVendor({ sub: { status: "active", expiryDate: new Date(Date.now() - 40 * DAY) } });
    await db.collection("shops").updateOne({ _id: v.shopIdObj }, { $set: { bankDetails: { accountHolderName: "V", bankName: "B", accountNumber: "123456789012", ifscCode: "HDFC0001234" } } });
    await db.collection("wallets").insertOne({ shopId: v.shopIdObj, type: "VENDOR", status: "ACTIVE", currency: "INR", pendingBalance: 0, withdrawableBalance: 1000, frozenBalance: 0, minimumThreshold: 500, version: 0 });
    const get = async (path: string, mod: any) => (await call(mod.GET, path, { bearer: v.bearer })).status;
    expect(await get("/api/vendor/wallet", R.wallet)).toBe(200);
    expect(await get("/api/vendor/wallet/ledger", R.ledger)).toBe(200);
    expect(await get("/api/vendor/wallet/orders", R.walletOrders)).toBe(200);
    expect(await get("/api/vendor/payouts", R.payouts)).toBe(200);
    expect(await get("/api/vendor/bank-details", R.bank)).toBe(200);
    expect(await get("/api/vendor/settings", R.settings)).toBe(200);
    expect(await get("/api/vendor/stats", R.stats)).toBe(200);
    expect((await call(R.bank.PUT, "/api/vendor/bank-details", { method: "PUT", bearer: v.bearer, body: { accountHolderName: "V", bankName: "B", accountNumber: "123456789012", ifscCode: "HDFC0001234" } })).status).toBe(200);
    expect(await call(R.payouts.POST, "/api/vendor/payouts", { bearer: v.bearer, body: { amount: 600 } })).toMatchObject({ status: 200, body: { success: true } });
    // Selling features are still blocked, and status says so.
    expect(await orders(v.bearer)).toMatchObject({ status: 403, body: { code: "SUBSCRIPTION_EXPIRED" } });
    expect((await call(R.status.GET, "/api/vendor/status", { bearer: v.bearer })).body.blockingCode).toBe("SUBSCRIPTION_EXPIRED");
    // …but the MOU still gates the money routes.
    const noMou = await makeVendor({ mou: false, sub: null });
    expect(await call(R.wallet.GET, "/api/vendor/wallet", { bearer: noMou.bearer })).toMatchObject({ status: 403, body: { code: "MOU_REQUIRED" } });
  });

  it("unapproved shop → SHOP_PENDING on approval-only routes, standard routes still work", async () => {
    const v = await makeVendor({ approved: false });
    expect(await orders(v.bearer)).toMatchObject({ status: 403, body: { code: "SHOP_PENDING" } });
    expect(await call(R.products.GET, "/api/vendor/products", { bearer: v.bearer })).toMatchObject({ status: 403, body: { code: "SHOP_PENDING" } });
    expect((await settings(v.bearer)).status).toBe(200);
  });

  it("the web session path goes through the same guard", async () => {
    const blocked = await makeVendor({ mou: false });
    auth.session = blocked.session;
    expect(await orders()).toMatchObject({ status: 403, body: { code: "MOU_REQUIRED" } });
    const ok = await makeVendor();
    auth.session = ok.session;
    expect((await orders()).status).toBe(200);
  });

  it("no auth → 401 UNAUTHORIZED, customer → 403 NOT_VENDOR, no shop → 404 SHOP_NOT_FOUND", async () => {
    expect(await orders()).toMatchObject({ status: 401, body: { code: "UNAUTHORIZED" } });
    const customer = await makeVendor({ role: "user" });
    expect(await orders(customer.bearer)).toMatchObject({ status: 403, body: { code: "NOT_VENDOR" } });
    const noShop = await makeVendor({ withShop: false });
    expect(await orders(noShop.bearer)).toMatchObject({ status: 404, body: { code: "SHOP_NOT_FOUND" } });
  });

  it("status and MOU routes stay reachable for a blocked vendor; status reports blockingCode", async () => {
    const v = await makeVendor({ mou: false, sub: null, approved: false });
    expect(await call(R.status.GET, "/api/vendor/status", { bearer: v.bearer })).toMatchObject({
      status: 200,
      body: { mouAccepted: false, isApproved: false, blockingCode: "MOU_REQUIRED" },
    });
    expect((await call(R.mou.GET, "/api/vendor/mou", { bearer: v.bearer })).status).toBe(200);
    const expired = await makeVendor({ sub: null });
    expect((await call(R.status.GET, "/api/vendor/status", { bearer: expired.bearer })).body.blockingCode).toBe("SUBSCRIPTION_EXPIRED");
    const fine = await makeVendor({ approved: false });
    expect((await call(R.status.GET, "/api/vendor/status", { bearer: fine.bearer })).body.blockingCode).toBeNull();
  });
});

describe("subscription payment is web-only", () => {
  it("mobile (Bearer) create-order and verify-payment → 403 PAYMENT_NOT_AVAILABLE_ON_MOBILE with status only", async () => {
    const v = await makeVendor({ sub: null });
    const before = rzp.created;
    const res = await call(R.subCreate.POST, "/api/vendor/subscription/create-order", { method: "POST", bearer: v.bearer });
    expect(res).toMatchObject({ status: 403, body: { code: "PAYMENT_NOT_AVAILABLE_ON_MOBILE", subscription: { status: "no_subscription", isBlocked: true } } });
    expect(res.body.id).toBeUndefined();
    expect(rzp.created).toBe(before); // no Razorpay order was created

    const crypto = await import("crypto");
    const sig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update("order_x|pay_x").digest("hex");
    const verify = await call(R.subVerify.POST, "/api/vendor/subscription/verify-payment", { bearer: v.bearer, body: { razorpayOrderId: "order_x", razorpayPaymentId: "pay_x", razorpaySignature: sig } });
    expect(verify).toMatchObject({ status: 403, body: { code: "PAYMENT_NOT_AVAILABLE_ON_MOBILE" } });
  });

  it("web (session) create-order still creates the Razorpay order", async () => {
    const v = await makeVendor({ sub: null });
    auth.session = v.session;
    const res = await call(R.subCreate.POST, "/api/vendor/subscription/create-order", { method: "POST" });
    expect(res.status).toBe(200);
    expect(res.body.id).toMatch(/^order_sub_/);
  });
});
