// Contract tests: every route in lib/contracts MOBILE_ROUTES is called
// through its real handler with a mobile Bearer token. Positive case: the
// response parses with the route's zod schema. Negative cases: no/invalid
// token → 401, a customer on vendor routes → 401/403, and `{ error, code }`
// bodies on routes that promise codes. A route added to MOBILE_ROUTES
// without a case here fails the coverage test.

import crypto from "crypto";
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call, type CallOptions } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
const rzp = vi.hoisted(() => ({ payments: new Map<string, any>(), seq: 0 }));
vi.mock("razorpay", () => ({
  default: class {
    orders = { create: async (o: any) => ({ id: `order_C${++rzp.seq}`, amount: o.amount, currency: o.currency }) };
    payments = { fetch: async (id: string) => { const p = rzp.payments.get(id); if (!p) throw new Error("nf"); return p; } };
  },
}));
vi.mock("nodemailer", () => {
  const t = { createTransport: () => ({ sendMail: async () => ({ messageId: "t" }) }) };
  return { default: t, ...t };
});

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let C: typeof import("@/lib/contracts");
let sign: typeof import("@/lib/mobile-tokens").signAccessToken;

const PW = "contract-pass";
const oid = () => new mongoose.Types.ObjectId();
const ids = { customer: oid(), vendor: oid(), shop: oid(), product: oid(), address: oid(), vendorOrder: oid(), pwUser: oid(), delUser: oid() };
const tok: Record<string, string> = {};
const address = { name: "Buyer", phone: "9999999999", street: "1 Test St", city: "Mumbai", state: "MH", pincode: "400001", country: "India" };

// path + method → handler, loaded lazily.
const MODULES: Record<string, () => Promise<any>> = {
  "/api/mobile-auth/login": () => import("@/app/api/mobile-auth/login/route"),
  "/api/mobile-auth/refresh": () => import("@/app/api/mobile-auth/refresh/route"),
  "/api/mobile-auth/logout": () => import("@/app/api/mobile-auth/logout/route"),
  "/api/auth/change-password": () => import("@/app/api/auth/change-password/route"),
  "/api/app-config": () => import("@/app/api/app-config/route"),
  "/api/products": () => import("@/app/api/products/route"),
  "/api/pricing/quote": () => import("@/app/api/pricing/quote/route"),
  "/api/users/profile": () => import("@/app/api/users/profile/route"),
  "/api/users/push-token": () => import("@/app/api/users/push-token/route"),
  "/api/users/me": () => import("@/app/api/users/me/route"),
  "/api/addresses": () => import("@/app/api/addresses/route"),
  "/api/addresses/:id": () => import("@/app/api/addresses/[id]/route"),
  "/api/cart": () => import("@/app/api/cart/route"),
  "/api/favourites": () => import("@/app/api/favourites/route"),
  "/api/orders": () => import("@/app/api/orders/route"),
  "/api/coupons/validate": () => import("@/app/api/coupons/validate/route"),
  "/api/razorpay/create-order": () => import("@/app/api/razorpay/create-order/route"),
  "/api/razorpay/verify-payment": () => import("@/app/api/razorpay/verify-payment/route"),
  "/api/vendor/status": () => import("@/app/api/vendor/status/route"),
  "/api/vendor/mou": () => import("@/app/api/vendor/mou/route"),
  "/api/vendor/stats": () => import("@/app/api/vendor/stats/route"),
  "/api/vendor/wallet": () => import("@/app/api/vendor/wallet/route"),
  "/api/vendor/wallet/ledger": () => import("@/app/api/vendor/wallet/ledger/route"),
  "/api/vendor/payouts": () => import("@/app/api/vendor/payouts/route"),
  "/api/vendor/bank-details": () => import("@/app/api/vendor/bank-details/route"),
  "/api/vendor/settings": () => import("@/app/api/vendor/settings/route"),
  "/api/vendor/orders": () => import("@/app/api/vendor/orders/route"),
  "/api/vendor/orders/:id": () => import("@/app/api/vendor/orders/[id]/route"),
  "/api/vendor/products": () => import("@/app/api/vendor/products/route"),
  "/api/vendor/products/stats": () => import("@/app/api/vendor/products/stats/route"),
  "/api/vendor/reviews": () => import("@/app/api/vendor/reviews/route"),
  "/api/vendor/coupons": () => import("@/app/api/vendor/coupons/route"),
  "/api/vendor/subscription/create-order": () => import("@/app/api/vendor/subscription/create-order/route"),
};
async function hit(method: string, path: string, opts: CallOptions & { id?: string } = {}) {
  const mod = await MODULES[path]();
  const handler = mod[method];
  if (!handler) throw new Error(`${method} ${path}: no handler exported`);
  const url = opts.id ? path.replace(":id", opts.id) : path;
  return call(handler, url, { method, ...opts, params: opts.id ? { id: opts.id } : undefined });
}

const items = () => [{ product: String(ids.product), quantity: 1 }];
const razorpaySig = (o: string, p: string) => crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${o}|${p}`).digest("hex");

// Happy-path request per route (key: "METHOD path"). Returns the call result.
const HAPPY: Record<string, () => Promise<any>> = {
  "POST /api/mobile-auth/login": () => hit("POST", "/api/mobile-auth/login", { body: { email: "customer@contract.test", password: PW } }),
  "POST /api/mobile-auth/refresh": async () => {
    const t = (await hit("POST", "/api/mobile-auth/login", { body: { email: "customer@contract.test", password: PW } })).body;
    return hit("POST", "/api/mobile-auth/refresh", { body: { refreshToken: t.refreshToken } });
  },
  "POST /api/mobile-auth/logout": async () => {
    const t = (await hit("POST", "/api/mobile-auth/login", { body: { email: "customer@contract.test", password: PW } })).body;
    return hit("POST", "/api/mobile-auth/logout", { body: { refreshToken: t.refreshToken } });
  },
  "POST /api/auth/change-password": () => hit("POST", "/api/auth/change-password", { bearer: tok.pwUser, body: { currentPassword: PW, newPassword: "new-password-1" } }),
  "GET /api/app-config": () => hit("GET", "/api/app-config"),
  "GET /api/products": () => hit("GET", "/api/products", { query: { search: "Contract", limit: 20 } }),
  "POST /api/pricing/quote": () => hit("POST", "/api/pricing/quote", { bearer: tok.customer, body: { items: items(), couponCode: "CONTRACT5" } }),
  "GET /api/users/profile": () => hit("GET", "/api/users/profile", { bearer: tok.customer }),
  "PUT /api/users/profile": () => hit("PUT", "/api/users/profile", { bearer: tok.customer, body: { name: "Contract Customer", city: "Pune" } }),
  "POST /api/users/push-token": () => hit("POST", "/api/users/push-token", { bearer: tok.customer, body: { token: "ExponentPushToken[contract]", platform: "android" } }),
  "DELETE /api/users/push-token": () => hit("DELETE", "/api/users/push-token", { bearer: tok.customer, body: { token: "ExponentPushToken[contract]" } }),
  "DELETE /api/users/me": () => hit("DELETE", "/api/users/me", { bearer: tok.delUser, body: { confirm: "DELETE", password: PW } }),
  "GET /api/addresses": () => hit("GET", "/api/addresses", { bearer: tok.customer }),
  "POST /api/addresses": () => hit("POST", "/api/addresses", { bearer: tok.customer, body: { ...address, label: "Work" } }),
  "PUT /api/addresses/:id": () => hit("PUT", "/api/addresses/:id", { bearer: tok.customer, id: String(ids.address), body: { city: "Thane" } }),
  "DELETE /api/addresses/:id": async () => {
    const created = await hit("POST", "/api/addresses", { bearer: tok.customer, body: address });
    return hit("DELETE", "/api/addresses/:id", { bearer: tok.customer, id: String(created.body._id) });
  },
  "GET /api/cart": () => hit("GET", "/api/cart", { bearer: tok.customer }),
  "POST /api/cart": () => hit("POST", "/api/cart", { bearer: tok.customer, body: { items: [{ productId: String(ids.product), name: "Contract Serum", slug: "contract-serum", quantity: 2 }] } }),
  "GET /api/favourites": () => hit("GET", "/api/favourites", { bearer: tok.customer }),
  "POST /api/favourites": () => hit("POST", "/api/favourites", { bearer: tok.customer, body: { type: "product", refId: String(ids.product) } }),
  "GET /api/orders": () => hit("GET", "/api/orders", { bearer: tok.customer }),
  "POST /api/orders": () => hit("POST", "/api/orders", { bearer: tok.customer, headers: { "X-Idempotency-Key": crypto.randomUUID() }, body: { items: items(), shippingAddress: address } }),
  "POST /api/coupons/validate": () => hit("POST", "/api/coupons/validate", { bearer: tok.customer, body: { items: items(), couponCode: "CONTRACT5" } }),
  "POST /api/razorpay/create-order": () => hit("POST", "/api/razorpay/create-order", { bearer: tok.customer, body: { items: items(), shippingAddress: address } }),
  "POST /api/razorpay/verify-payment": async () => {
    const order = (await hit("POST", "/api/razorpay/create-order", { bearer: tok.customer, body: { items: items(), shippingAddress: address } })).body;
    rzp.payments.set("pay_contract", { id: "pay_contract", order_id: order.id, status: "captured", amount: order.amount, currency: order.currency });
    return hit("POST", "/api/razorpay/verify-payment", { bearer: tok.customer, body: { razorpayOrderId: order.id, razorpayPaymentId: "pay_contract", razorpaySignature: razorpaySig(order.id, "pay_contract"), shippingAddress: address } });
  },
  "GET /api/vendor/status": () => hit("GET", "/api/vendor/status", { bearer: tok.vendor }),
  "GET /api/vendor/mou": () => hit("GET", "/api/vendor/mou", { bearer: tok.vendor }),
  "POST /api/vendor/mou": () => hit("POST", "/api/vendor/mou", { bearer: tok.vendor }),
  "GET /api/vendor/stats": () => hit("GET", "/api/vendor/stats", { bearer: tok.vendor }),
  "GET /api/vendor/wallet": () => hit("GET", "/api/vendor/wallet", { bearer: tok.vendor }),
  "GET /api/vendor/wallet/ledger": () => hit("GET", "/api/vendor/wallet/ledger", { bearer: tok.vendor }),
  "GET /api/vendor/payouts": () => hit("GET", "/api/vendor/payouts", { bearer: tok.vendor }),
  "POST /api/vendor/payouts": () => hit("POST", "/api/vendor/payouts", { bearer: tok.vendor, body: { amount: 600, notes: "contract" } }),
  "GET /api/vendor/bank-details": () => hit("GET", "/api/vendor/bank-details", { bearer: tok.vendor }),
  "PUT /api/vendor/bank-details": () => hit("PUT", "/api/vendor/bank-details", { bearer: tok.vendor, body: { accountHolderName: "V", bankName: "Bank", accountNumber: "123456789012", ifscCode: "HDFC0001234" } }),
  "GET /api/vendor/settings": () => hit("GET", "/api/vendor/settings", { bearer: tok.vendor }),
  "GET /api/vendor/orders": () => hit("GET", "/api/vendor/orders", { bearer: tok.vendor }),
  "PATCH /api/vendor/orders/:id": () => hit("PATCH", "/api/vendor/orders/:id", { bearer: tok.vendor, id: String(ids.vendorOrder), body: { orderStatus: "processing" } }),
  "GET /api/vendor/products": () => hit("GET", "/api/vendor/products", { bearer: tok.vendor }),
  "GET /api/vendor/products/stats": () => hit("GET", "/api/vendor/products/stats", { bearer: tok.vendor }),
  "GET /api/vendor/reviews": () => hit("GET", "/api/vendor/reviews", { bearer: tok.vendor }),
  "GET /api/vendor/coupons": () => hit("GET", "/api/vendor/coupons", { bearer: tok.vendor }),
  // From the app this is status-only: the "happy" outcome is the 403 body.
  "POST /api/vendor/subscription/create-order": () => hit("POST", "/api/vendor/subscription/create-order", { bearer: tok.vendor }),
};
const EXPECTED_STATUS: Record<string, number> = { "POST /api/vendor/subscription/create-order": 403, "POST /api/addresses": 201 };
// Well-formed bodies for the negative tests, so auth is the only thing wrong.
const NEG_BODY: Record<string, unknown> = {
  "POST /api/auth/change-password": { currentPassword: "x", newPassword: "yyyyyyyy" },
  // Signature is checked before the session, so it must be valid here.
  "POST /api/razorpay/verify-payment": { razorpayOrderId: "order_neg", razorpayPaymentId: "pay_neg", razorpaySignature: razorpaySig("order_neg", "pay_neg") },
};
const negBody = (r: { method: string; path: string }) => (r.method === "GET" ? undefined : NEG_BODY[`${r.method} ${r.path}`] ?? {});

beforeAll(async () => {
  db = await startTestDb();
  C = await import("@/lib/contracts");
  ({ signAccessToken: sign } = await import("@/lib/mobile-tokens"));
  for (const load of Object.values(MODULES)) await load();
  for (const m of ["order", "wallet", "ledger", "coupon", "vendor-subscription", "vendor-subscription-settings", "platform-settings", "payment-settings", "payout", "review", "address", "Favourite", "cart"]) {
    await import(`@/lib/models/${m}`);
  }
  await initModels();

  const pw = await hash(PW, 4);
  const users = [
    { _id: ids.customer, email: "customer@contract.test", role: "user" },
    { _id: ids.vendor, email: "vendor@contract.test", role: "shop_owner", shopId: ids.shop },
    { _id: ids.pwUser, email: "pw@contract.test", role: "user" },
    { _id: ids.delUser, email: "del@contract.test", role: "user" },
  ];
  await db.collection("users").insertMany(users.map((u) => ({ name: "Contract", isActive: true, isVerified: true, password: pw, pushTokens: [], ...u })));
  for (const u of users) {
    tok[Object.entries(ids).find(([, v]) => v === u._id)![0]] = sign({ id: String(u._id), email: u.email, name: "Contract", role: u.role, shopId: u.shopId ? String(u.shopId) : null }, "contract").token;
  }
  await db.collection("shops").insertOne({
    _id: ids.shop, ownerId: ids.vendor, shopName: "Contract Shop", slug: "contract-shop", isApproved: true, isActive: true, commissionRate: 10,
    address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: "shop@contract.test" },
    bankDetails: { accountHolderName: "V", bankName: "B", accountNumber: "123456789012", ifscCode: "HDFC0001234" },
  });
  const { CURRENT_MOU_VERSION } = await import("@/lib/mou-content");
  await db.collection("vendormouacceptances").insertOne({ userId: ids.vendor, shopId: ids.shop, mouVersion: CURRENT_MOU_VERSION, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
  await db.collection("vendorsubscriptions").insertOne({ shopId: ids.shop, status: "active", expiryDate: new Date(Date.now() + 90 * 86400000), amount: 999, currency: "INR", paymentHistory: [], source: "paid" });
  await db.collection("wallets").insertOne({ shopId: ids.shop, type: "VENDOR", status: "ACTIVE", currency: "INR", pendingBalance: 0, withdrawableBalance: 1000, frozenBalance: 0, minimumThreshold: 500, version: 0 });
  await db.collection("products").insertOne({ _id: ids.product, name: "Contract Serum", slug: "contract-serum", price: 500, stock: 1000, shopId: ids.shop, category: oid(), isActive: true, approvalStatus: "approved" });
  await db.collection("coupons").insertOne({ shopId: ids.shop, code: "CONTRACT5", discountType: "fixed", discountValue: 5, minOrderValue: 0, usageCount: 0, isActive: true });
  await db.collection("addresses").insertOne({ _id: ids.address, userId: ids.customer, label: "Home", isDefault: true, ...address });
  await db.collection("orders").insertOne({
    _id: ids.vendorOrder, orderNumber: "ORD-CONTRACT-1", user: ids.customer, totalAmount: 500, paymentMethod: "cod", paymentStatus: "pending", orderStatus: "pending",
    items: [{ product: ids.product, quantity: 1, price: 500, shopId: ids.shop, shopName: "Contract Shop" }], shippingAddress: address, createdAt: new Date(), updatedAt: new Date(),
  });
});
afterAll(stopTestDb);

describe("contract coverage", () => {
  it("every MOBILE_ROUTES entry has a happy-path case and a handler", async () => {
    const keys = C.MOBILE_ROUTES.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.keys(HAPPY).sort()).toEqual([...keys].sort());
    for (const r of C.MOBILE_ROUTES) expect(typeof (await MODULES[r.path]())[r.method]).toBe("function");
  });

  it("lib/contracts imports nothing but zod and itself (shareable with the mobile app)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "lib", "contracts");
    for (const f of fs.readdirSync(dir)) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      for (const [, spec] of src.matchAll(/from "([^"]+)"/g)) expect(spec === "zod" || spec.startsWith("./"), `${f} imports ${spec}`).toBe(true);
    }
  });
});

describe("positive: responses match their schemas", () => {
  for (const key of Object.keys(HAPPY)) {
    it(key, async () => {
      const route = C.MOBILE_ROUTES.find((r) => `${r.method} ${r.path}` === key)!;
      const res = await HAPPY[key]();
      expect(res.status, JSON.stringify(res.body)).toBe(EXPECTED_STATUS[key] ?? 200);
      if (route.response) {
        const parsed = route.response.safeParse(res.body);
        expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
      }
    });
  }
});

describe("negative: auth and error format", () => {
  const protectedRoutes = () => C.MOBILE_ROUTES.filter((r) => ["user", "vendor", "vendor-approved"].includes(r.auth));

  it("no token → 401 on every protected route", async () => {
    for (const r of protectedRoutes()) {
      const res = await hit(r.method, r.path, { id: String(oid()), body: negBody(r) });
      expect(res.status, `${r.method} ${r.path}`).toBe(401);
      if (r.errorCodes) expect(C.apiErrorBody.safeParse(res.body).success, `${r.method} ${r.path} ${JSON.stringify(res.body)}`).toBe(true);
    }
  });

  it("invalid or legacy-signed token → 401 on every protected route", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const legacy = jwt.sign({ id: String(ids.customer), role: "user" }, process.env.NEXTAUTH_SECRET!);
    for (const bearer of ["garbage", legacy]) {
      for (const r of protectedRoutes()) {
        const res = await hit(r.method, r.path, { bearer, id: String(oid()), body: negBody(r) });
        expect(res.status, `${r.method} ${r.path}`).toBe(401);
      }
    }
  });

  it("a customer token on vendor routes → 401/403, never data", async () => {
    for (const r of C.MOBILE_ROUTES.filter((x) => x.auth.startsWith("vendor"))) {
      const res = await hit(r.method, r.path, { bearer: tok.customer, id: String(ids.vendorOrder), body: negBody(r) });
      expect([401, 403], `${r.method} ${r.path}`).toContain(res.status);
      if (r.errorCodes) expect(String(res.body?.code), `${r.method} ${r.path} ${JSON.stringify(res.body)}`).toMatch(/^(NOT_VENDOR|UNAUTHORIZED)$/);
    }
  });

  it("malformed bodies on validated routes → 400 VALIDATION_ERROR (or route-specific code)", async () => {
    const cases: Array<[string, string, CallOptions, string]> = [
      ["POST", "/api/mobile-auth/login", { body: { email: "x" } }, "VALIDATION_ERROR"],
      ["POST", "/api/mobile-auth/refresh", { body: {} }, "VALIDATION_ERROR"],
      ["POST", "/api/pricing/quote", { body: { items: "nope" } }, "VALIDATION_ERROR"],
      ["POST", "/api/users/push-token", { bearer: tok.customer, body: { token: "abc" } }, "VALIDATION_ERROR"],
      ["DELETE", "/api/users/me", { bearer: tok.customer, body: {} }, "CONFIRMATION_REQUIRED"],
    ];
    for (const [method, path, opts, code] of cases) {
      const res = await hit(method, path, opts);
      expect(res.status, `${method} ${path}`).toBe(400);
      expect(res.body).toMatchObject({ code });
      expect(C.apiErrorBody.safeParse(res.body).success).toBe(true);
    }
  });

  it("business-rule errors carry codes: pricing, open orders, vendor gates", async () => {
    expect(await hit("POST", "/api/pricing/quote", { body: { items: [{ product: String(oid()), quantity: 1 }] } })).toMatchObject({ status: 404, body: { code: "PRICING_ERROR" } });
    // The customer has an open (pending) order → cannot delete the account.
    expect(await hit("DELETE", "/api/users/me", { bearer: tok.customer, body: { confirm: "DELETE", password: PW } })).toMatchObject({ status: 409, body: { code: "OPEN_ORDERS" } });
    await db.collection("vendorsubscriptions").updateOne({ shopId: ids.shop }, { $set: { expiryDate: new Date(Date.now() - 30 * 86400000) } });
    try {
      const res = await hit("GET", "/api/vendor/orders", { bearer: tok.vendor });
      expect(res.status).toBe(403);
      expect(C.vendorBlockedBody.parse(res.body).code).toBe("SUBSCRIPTION_EXPIRED");
      expect((await hit("GET", "/api/vendor/status", { bearer: tok.vendor })).body.blockingCode).toBe("SUBSCRIPTION_EXPIRED");
    } finally {
      await db.collection("vendorsubscriptions").updateOne({ shopId: ids.shop }, { $set: { expiryDate: new Date(Date.now() + 90 * 86400000) } });
    }
  });
});
