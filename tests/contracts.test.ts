// Contract tests: every route in lib/contracts MOBILE_ROUTES is called
// through its real handler with a mobile Bearer token. Positive case: the
// response parses with the route's zod schema. Negative cases: no/invalid
// token → 401, a customer on vendor routes → 401/403, and `{ error, code }`
// bodies on routes that promise codes. A route added to MOBILE_ROUTES
// without a case here fails the coverage test. Sign-up, email codes and
// password reset are also run end to end, reading the code from the email.

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
const mail = vi.hoisted(() => ({ sent: [] as { to: string; html?: string }[] }));
vi.mock("nodemailer", () => {
  const t = { createTransport: () => ({ sendMail: async (m: any) => { mail.sent.push(m); return { messageId: "t" }; } }) };
  return { default: t, ...t };
});
/** The 6-digit code most recently emailed to `email` (the element whose whole text is the code). */
function emailedCode(email: string): string {
  const code = mail.sent.filter((m) => m.to === email).at(-1)?.html?.match(/>\s*(\d{6})\s*</)?.[1];
  if (!code) throw new Error(`no code was emailed to ${email}`);
  return code;
}

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let C: typeof import("@/lib/contracts");
let sign: typeof import("@/lib/mobile-tokens").signAccessToken;

const PW = "contract-pass";
const oid = () => new mongoose.Types.ObjectId();
const ids = { customer: oid(), vendor: oid(), shop: oid(), product: oid(), address: oid(), vendorOrder: oid(), pwUser: oid(), delUser: oid(), reset1: oid(), reset2: oid(), reset3: oid() };
const tok: Record<string, string> = {};
const address = { name: "Buyer", phone: "9999999999", street: "1 Test St", city: "Mumbai", state: "MH", pincode: "400001", country: "India" };

// path + method → handler, loaded lazily.
const MODULES: Record<string, () => Promise<any>> = {
  "/api/mobile-auth/login": () => import("@/app/api/mobile-auth/login/route"),
  "/api/mobile-auth/refresh": () => import("@/app/api/mobile-auth/refresh/route"),
  "/api/mobile-auth/logout": () => import("@/app/api/mobile-auth/logout/route"),
  "/api/auth/change-password": () => import("@/app/api/auth/change-password/route"),
  "/api/auth/register": () => import("@/app/api/auth/register/route"),
  "/api/auth/register-vendor": () => import("@/app/api/auth/register-vendor/route"),
  "/api/auth/verify-otp": () => import("@/app/api/auth/verify-otp/route"),
  "/api/auth/resend-otp": () => import("@/app/api/auth/resend-otp/route"),
  "/api/auth/forgot-password": () => import("@/app/api/auth/forgot-password/route"),
  "/api/auth/verify-reset-otp": () => import("@/app/api/auth/verify-reset-otp/route"),
  "/api/auth/reset-password": () => import("@/app/api/auth/reset-password/route"),
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
const signUp = (email: string) => ({ name: "New Customer", email, password: PW, confirmPassword: PW });
const sellerSignUp = (email: string) => ({ name: "New Seller", email, password: PW, phone: "9876543210", shopName: "New Shop", street: "1 Shop St", city: "Pune", state: "MH", pincode: "411001" });
/** Requests a password-reset code for a seeded user and returns it. */
async function resetCode(email: string): Promise<string> {
  await hit("POST", "/api/auth/forgot-password", { body: { email } });
  return emailedCode(email);
}
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
  "POST /api/auth/register": () => hit("POST", "/api/auth/register", { body: signUp("register@contract.test") }),
  "POST /api/auth/register-vendor": () => hit("POST", "/api/auth/register-vendor", { body: sellerSignUp("register-vendor@contract.test") }),
  "POST /api/auth/verify-otp": async () => {
    await hit("POST", "/api/auth/register", { body: signUp("verify@contract.test") });
    return hit("POST", "/api/auth/verify-otp", { body: { email: "verify@contract.test", otp: emailedCode("verify@contract.test") } });
  },
  "POST /api/auth/resend-otp": async () => {
    await hit("POST", "/api/auth/register", { body: signUp("resend@contract.test") });
    // A new code may be requested 30 seconds after the previous one.
    await db.collection("otps").updateMany({ email: "resend@contract.test" }, { $set: { createdAt: new Date(Date.now() - 60_000) } });
    return hit("POST", "/api/auth/resend-otp", { body: { email: "resend@contract.test" } });
  },
  "POST /api/auth/forgot-password": () => hit("POST", "/api/auth/forgot-password", { body: { email: "reset1@contract.test" } }),
  "POST /api/auth/verify-reset-otp": async () => hit("POST", "/api/auth/verify-reset-otp", { body: { email: "reset2@contract.test", otp: await resetCode("reset2@contract.test") } }),
  "POST /api/auth/reset-password": async () => hit("POST", "/api/auth/reset-password", { body: { email: "reset3@contract.test", otp: await resetCode("reset3@contract.test"), newPassword: "reset-password-1" } }),
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
  "PATCH /api/addresses/:id": async () => {
    const created = await hit("POST", "/api/addresses", { bearer: tok.customer, body: { ...address, label: "Other" } });
    return hit("PATCH", "/api/addresses/:id", { bearer: tok.customer, id: String(created.body._id) });
  },
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
const EXPECTED_STATUS: Record<string, number> = { "POST /api/vendor/subscription/create-order": 403, "POST /api/addresses": 201, "POST /api/auth/register": 201, "POST /api/auth/register-vendor": 201 };
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
    { _id: ids.reset1, email: "reset1@contract.test", role: "user" },
    { _id: ids.reset2, email: "reset2@contract.test", role: "user" },
    { _id: ids.reset3, email: "reset3@contract.test", role: "user" },
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

describe("app config: Razorpay key id", () => {
  const config = async () => (await hit("GET", "/api/app-config")).body;

  it("publishes the key id the server creates orders under, and never the key secret", async () => {
    const body = await config();
    expect(body.payments.razorpayKeyId).toBe(process.env.RAZORPAY_KEY_ID);
    expect(JSON.stringify(body)).not.toContain(process.env.RAZORPAY_KEY_SECRET!);
  });

  it("withholds it when the variable does not hold a key id, or Razorpay is not the gateway", async () => {
    const saved = { keyId: process.env.RAZORPAY_KEY_ID, gateway: process.env.PAYMENT_GATEWAY };
    try {
      process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_SECRET; // a secret pasted into the wrong variable
      expect((await config()).payments.razorpayKeyId).toBeNull();
      process.env.RAZORPAY_KEY_ID = saved.keyId;
      process.env.PAYMENT_GATEWAY = "tap";
      expect((await config()).payments.razorpayKeyId).toBeNull();
    } finally {
      process.env.RAZORPAY_KEY_ID = saved.keyId;
      process.env.PAYMENT_GATEWAY = saved.gateway;
    }
  });

  it("withholds it when the admin has turned online payment off", async () => {
    await db.collection("paymentsettings").updateOne({}, { $set: { enableRazorpay: false } }, { upsert: true });
    try {
      expect((await config()).payments).toMatchObject({ razorpay: false, razorpayKeyId: null });
    } finally {
      await db.collection("paymentsettings").deleteMany({});
    }
  });
});

describe("sign-up, email codes and password reset", () => {
  it("POST /api/auth/register validates with the contract's schema itself", async () => {
    const { registerSchema } = await import("@/lib/validation");
    expect(registerSchema).toBe(C.registerRequest);
  });

  it("what the request schemas reject, the routes reject with 400", async () => {
    const cases: Array<[string, { safeParse: (v: unknown) => { success: boolean } }, unknown]> = [
      ["/api/auth/register", C.registerRequest, { ...signUp("bad@contract.test"), confirmPassword: "different" }],
      ["/api/auth/register", C.registerRequest, { ...signUp("bad@contract.test"), role: "customer" }],
      ["/api/auth/register", C.registerRequest, { ...signUp("bad@contract.test"), password: "12345", confirmPassword: "12345" }],
      ["/api/auth/register-vendor", C.registerVendorRequest, { ...sellerSignUp("bad@contract.test"), shopName: "" }],
      ["/api/auth/register-vendor", C.registerVendorRequest, { ...sellerSignUp("bad@contract.test"), pincode: undefined }],
      ["/api/auth/verify-otp", C.verifyOtpRequest, { email: "bad@contract.test" }],
      ["/api/auth/resend-otp", C.resendOtpRequest, {}],
      ["/api/auth/forgot-password", C.forgotPasswordRequest, {}],
      ["/api/auth/verify-reset-otp", C.verifyResetOtpRequest, { email: "bad@contract.test" }],
      ["/api/auth/reset-password", C.resetPasswordRequest, { email: "bad@contract.test", otp: "123456", newPassword: "12345" }],
    ];
    for (const [path, schema, body] of cases) {
      expect(schema.safeParse(body).success, `${path} schema`).toBe(false);
      expect((await hit("POST", path, { body })).status, `${path} route`).toBe(400);
    }
  });

  it("customer: a wrong code is refused, the emailed code creates the account, and it can sign in", async () => {
    const email = "flow-customer@contract.test";
    expect(C.registerRequest.safeParse(signUp(email)).success).toBe(true);
    expect((await hit("POST", "/api/auth/register", { body: signUp(email) })).status).toBe(201);

    const code = emailedCode(email);
    const wrong = code === "000000" ? "111111" : "000000";
    expect((await hit("POST", "/api/auth/verify-otp", { body: { email, otp: wrong } })).status).toBe(400);
    expect(await hit("POST", "/api/auth/verify-otp", { body: { email, otp: code } })).toMatchObject({ status: 200, body: { role: "user" } });

    const login = await hit("POST", "/api/mobile-auth/login", { body: { email, password: PW } });
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ email, role: "user" });
  });

  it("seller: sign-up creates an unapproved shop, and the seller area starts at the agreement", async () => {
    const email = "flow-seller@contract.test";
    expect(C.registerVendorRequest.safeParse(sellerSignUp(email)).success).toBe(true);
    expect((await hit("POST", "/api/auth/register-vendor", { body: sellerSignUp(email) })).status).toBe(201);
    expect(await hit("POST", "/api/auth/verify-otp", { body: { email, otp: emailedCode(email) } })).toMatchObject({ status: 200, body: { role: "shop_owner" } });

    const login = await hit("POST", "/api/mobile-auth/login", { body: { email, password: PW } });
    expect(login.body.user).toMatchObject({ role: "shop_owner" });
    expect(login.body.user.shopId).toEqual(expect.any(String));
    const bearer = login.body.accessToken;

    // Not accepted yet: everything is blocked except the agreement itself.
    expect(C.vendorStatusResponse.parse((await hit("GET", "/api/vendor/status", { bearer })).body)).toMatchObject({ isApproved: false, mouAccepted: false, blockingCode: "MOU_REQUIRED" });
    expect(await hit("GET", "/api/vendor/wallet", { bearer })).toMatchObject({ status: 403, body: { code: "MOU_REQUIRED" } });

    // Accepted: money screens open; selling stays locked (no subscription, shop not approved).
    expect((await hit("POST", "/api/vendor/mou", { bearer })).status).toBe(200);
    expect(C.vendorStatusResponse.parse((await hit("GET", "/api/vendor/status", { bearer })).body)).toMatchObject({ isApproved: false, mouAccepted: true, blockingCode: "SUBSCRIPTION_EXPIRED" });
    expect((await hit("GET", "/api/vendor/wallet", { bearer })).status).toBe(200);
    expect(await hit("GET", "/api/vendor/orders", { bearer })).toMatchObject({ status: 403, body: { code: "SUBSCRIPTION_EXPIRED" } });
  });

  it("password reset: the code can be checked, then used once; the new password signs in", async () => {
    // Seeded for this test alone, so the other reset cases can't use up its limits.
    const email = "flow-reset@contract.test";
    await db.collection("users").insertOne({ name: "Contract", email, role: "user", isActive: true, isVerified: true, password: await hash(PW, 4), pushTokens: [] });

    const otp = await resetCode(email);
    expect((await hit("POST", "/api/auth/verify-reset-otp", { body: { email, otp } })).status).toBe(200);
    expect((await hit("POST", "/api/auth/reset-password", { body: { email, otp, newPassword: "brand-new-pass" } })).status).toBe(200);
    expect((await hit("POST", "/api/auth/reset-password", { body: { email, otp, newPassword: "another-pass-1" } })).status).toBe(400);

    expect((await hit("POST", "/api/mobile-auth/login", { body: { email, password: "brand-new-pass" } })).status).toBe(200);
    expect((await hit("POST", "/api/mobile-auth/login", { body: { email, password: PW } })).status).toBe(401);
  });

  it("forgot-password answers the same for an unknown email (no account enumeration)", async () => {
    const known = await hit("POST", "/api/auth/forgot-password", { body: { email: "customer@contract.test" } });
    const unknown = await hit("POST", "/api/auth/forgot-password", { body: { email: "nobody@contract.test" } });
    expect(unknown).toMatchObject({ status: known.status, body: known.body });
    expect(C.messageResponse.safeParse(unknown.body).success).toBe(true);
  });
});

describe("addresses: PATCH /api/addresses/:id", () => {
  it("makes that address the default and the user's others not", async () => {
    const created = await hit("POST", "/api/addresses", { bearer: tok.customer, body: { ...address, label: "Work" } });
    const res = await hit("PATCH", "/api/addresses/:id", { bearer: tok.customer, id: String(created.body._id) });
    expect(res).toMatchObject({ status: 200, body: { _id: created.body._id, isDefault: true } });

    const list = C.addressListResponse.parse((await hit("GET", "/api/addresses", { bearer: tok.customer })).body);
    expect(list.filter((a) => a.isDefault).map((a) => a._id)).toEqual([created.body._id]);
  });

  it("another user's address → 404", async () => {
    const res = await hit("PATCH", "/api/addresses/:id", { bearer: tok.pwUser, id: String(ids.address) });
    expect(res.status).toBe(404);
  });
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
