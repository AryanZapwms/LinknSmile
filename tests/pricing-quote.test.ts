// POST /api/pricing/quote and GET /api/app-config.

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let quote: typeof import("@/app/api/pricing/quote/route").POST;
let validate: typeof import("@/app/api/coupons/validate/route").POST;
let appConfig: typeof import("@/app/api/app-config/route").GET;
let contracts: { pricing: typeof import("@/lib/contracts/pricing"); app: typeof import("@/lib/contracts/app-config") };
let bearer: string;

const shopId = new mongoose.Types.ObjectId();
const plain = new mongoose.Types.ObjectId();
const sized = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  db = await startTestDb();
  quote = (await import("@/app/api/pricing/quote/route")).POST;
  validate = (await import("@/app/api/coupons/validate/route")).POST;
  appConfig = (await import("@/app/api/app-config/route")).GET;
  contracts = { pricing: await import("@/lib/contracts/pricing"), app: await import("@/lib/contracts/app-config") };
  const { signAccessToken } = await import("@/lib/mobile-tokens");
  bearer = signAccessToken({ id: String(userId), email: "q@e.com", name: "Q", role: "user", shopId: null }, "f").token;
  await import("@/lib/models/coupon");
  await import("@/lib/models/platform-settings");
  await import("@/lib/models/payment-settings");
  await initModels();
  await db.collection("users").insertOne({ _id: userId, email: "q@e.com", name: "Q", role: "user", isActive: true });
  await db.collection("shops").insertOne({ _id: shopId, shopName: "Quote Shop", slug: "qs", commissionRate: 10, ownerId: new mongoose.Types.ObjectId() });
  await db.collection("products").insertMany([
    { _id: plain, name: "Plain", slug: "plain", price: 500, discountPrice: 400, stock: 10, shopId, isActive: true },
    { _id: sized, name: "Sized", slug: "sized", price: 999, stock: 10, shopId, isActive: true, sizes: [{ size: "L", unit: "ml", quantity: 250, price: 300, discountPrice: 250 }] },
  ]);
  await db.collection("coupons").insertOne({ shopId, code: "SAVE10", discountType: "percentage", discountValue: 10, minOrderValue: 0, usageCount: 0, isActive: true });
  await db.collection("platformsettings").insertOne({ taxRatePercent: 18, supportEmail: "help@linknsmile.com", supportPhone: "+91 1234" });
});
afterAll(stopTestDb);
afterEach(() => {
  delete process.env.MOBILE_MIN_SUPPORTED_VERSION;
  delete process.env.MOBILE_MIN_SUPPORTED_VERSION_IOS;
});

const items = () => [
  { product: String(plain), quantity: 2 },
  { product: String(sized), quantity: 1, selectedSize: { size: "L", quantity: 250 } },
];

describe("POST /api/pricing/quote", () => {
  it("guest quote: server prices, sizes, tax, no shipping", async () => {
    const res = await call(quote, "/api/pricing/quote", { body: { items: items() } });
    expect(res.status).toBe(200);
    expect(contracts.pricing.quoteResponse.parse(res.body)).toBeTruthy();
    expect(res.body).toMatchObject({
      currency: "INR", subtotal: 1050, discountAmount: 0, coupon: null, taxRatePercent: 18, taxAmount: 189, shippingAmount: 0, totalAmount: 1239,
    });
    expect(res.body.items[0]).toMatchObject({ name: "Plain", unitPrice: 400, lineTotal: 800, shopName: "Quote Shop", selectedSize: null });
    expect(res.body.items[1]).toMatchObject({ unitPrice: 250, selectedSize: { size: "L", quantity: 250 } });
  });

  it("with a coupon: same numbers as /api/coupons/validate (both call computeOrderPricing)", async () => {
    const q = await call(quote, "/api/pricing/quote", { bearer, body: { items: items(), couponCode: "save10" } });
    expect(q.body).toMatchObject({ subtotal: 1050, discountAmount: 105, coupon: { code: "SAVE10", shopId: String(shopId) }, taxAmount: 170.1, totalAmount: 1115.1 });
    const v = await call(validate, "/api/coupons/validate", { bearer, body: { items: items(), couponCode: "save10" } });
    expect(v.body).toMatchObject({ discountAmount: q.body.discountAmount, totalAmount: q.body.totalAmount, taxAmount: q.body.taxAmount });
    // A quote never redeems the coupon.
    expect((await db.collection("coupons").findOne({ code: "SAVE10" }))?.usageCount).toBe(0);
  });

  it("errors: coupon needs login, bad coupon/product are PRICING_ERROR, malformed is VALIDATION_ERROR", async () => {
    expect(await call(quote, "/api/pricing/quote", { body: { items: items(), couponCode: "SAVE10" } })).toMatchObject({ status: 401, body: { code: "UNAUTHORIZED" } });
    expect(await call(quote, "/api/pricing/quote", { bearer, body: { items: items(), couponCode: "NOPE" } })).toMatchObject({ status: 400, body: { code: "PRICING_ERROR", error: "Invalid coupon code" } });
    expect(await call(quote, "/api/pricing/quote", { body: { items: [{ product: String(new mongoose.Types.ObjectId()), quantity: 1 }] } })).toMatchObject({ status: 404, body: { code: "PRICING_ERROR" } });
    expect(await call(quote, "/api/pricing/quote", { body: { items: [{ product: String(sized), quantity: 1, selectedSize: { size: "XL", quantity: 1 } }] } })).toMatchObject({ status: 400, body: { code: "PRICING_ERROR" } });
    for (const body of [{}, { items: [] }, { items: [{ product: "x", quantity: 1 }] }, { items: [{ product: String(plain), quantity: 0 }] }, "nope"]) {
      expect(await call(quote, "/api/pricing/quote", { body })).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR" } });
    }
  });
});

describe("GET /api/app-config", () => {
  it("returns versions, support contacts from PlatformSettings, payments and links", async () => {
    process.env.MOBILE_MIN_SUPPORTED_VERSION = "1.2.0";
    process.env.MOBILE_MIN_SUPPORTED_VERSION_IOS = "1.3.0";
    const res = await call(appConfig, "/api/app-config");
    expect(res.status).toBe(200);
    expect(contracts.app.appConfigResponse.parse(res.body)).toBeTruthy();
    expect(res.body).toMatchObject({
      minSupportedAppVersion: { ios: "1.3.0", android: "1.2.0" },
      region: "IN",
      support: { email: "help@linknsmile.com", phone: "+91 1234" },
      payments: { cod: true, razorpay: true },
    });
    expect(res.body.links.privacyPolicy).toMatch(/\/privacy-policy$/);
  });

  it("isBelowVersion compares MAJOR.MINOR.PATCH numerically", () => {
    const { isBelowVersion } = contracts.app;
    expect(isBelowVersion("1.9.0", "1.10.0")).toBe(true);
    expect(isBelowVersion("1.10.0", "1.9.9")).toBe(false);
    expect(isBelowVersion("2.0.0", "2.0.0")).toBe(false);
    expect(isBelowVersion("0.9.9", "1.0.0")).toBe(true);
  });
});
