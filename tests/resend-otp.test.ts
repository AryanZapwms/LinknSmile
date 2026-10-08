// POST /api/auth/resend-otp during sign-up, against an in-memory MongoDB.
//
// Regression: resend-otp used to re-create the pending sign-up with only the
// name, password and role. A seller who tapped "Resend code" was then
// verified as a shop owner with no shop (verify-otp builds the shop from the
// pending shop fields), and /api/vendor/status answered 404 "Shop not found".

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
const mail = vi.hoisted(() => ({ sent: [] as { to: string; html?: string }[] }));
vi.mock("nodemailer", () => {
  const t = { createTransport: () => ({ sendMail: async (m: any) => { mail.sent.push(m); return { messageId: "t" }; } }) };
  return { default: t, ...t };
});

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let routes: Record<"registerVendor" | "register" | "resend" | "verify" | "login" | "vendorStatus", (req: any, ctx?: any) => Promise<Response>>;

const PASSWORD = "seller-pass-1";
const seller = (email: string) => ({
  name: "Asha Rao", email, password: PASSWORD, phone: "9876543210",
  shopName: "Asha Handlooms", description: "Handwoven sarees",
  street: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001",
  gstNumber: "27ABCDE1234F1Z5", panNumber: "ABCDE1234F",
});

const post = (handler: (req: any, ctx?: any) => Promise<Response>, path: string, body: unknown) => call(handler, path, { body });
/** Every 6-digit code emailed to `email`, oldest first (the element whose whole text is the code). */
const emailedCodes = (email: string) =>
  mail.sent.filter((m) => m.to === email).map((m) => m.html?.match(/>\s*(\d{6})\s*</)?.[1]).filter((c): c is string => !!c);
const latestCode = (email: string) => emailedCodes(email).at(-1)!;

/** "Resend code": allowed 30 seconds after the previous code, so the pending sign-up is aged first. */
async function resend(email: string) {
  await db.collection("otps").updateMany({ email }, { $set: { createdAt: new Date(Date.now() - 60_000) } });
  return post(routes.resend, "/api/auth/resend-otp", { email });
}

beforeAll(async () => {
  db = await startTestDb();
  routes = {
    registerVendor: (await import("@/app/api/auth/register-vendor/route")).POST,
    register: (await import("@/app/api/auth/register/route")).POST,
    resend: (await import("@/app/api/auth/resend-otp/route")).POST,
    verify: (await import("@/app/api/auth/verify-otp/route")).POST,
    login: (await import("@/app/api/mobile-auth/login/route")).POST,
    vendorStatus: (await import("@/app/api/vendor/status/route")).GET,
  };
  for (const m of ["vendor-subscription", "vendor-mou-acceptance"]) await import(`@/lib/models/${m}`);
  await initModels();
});
afterAll(stopTestDb);

describe("seller sign-up: Resend code", () => {
  it("keeps every detail the seller entered", async () => {
    const email = "kept@resend.test";
    expect((await post(routes.registerVendor, "/api/auth/register-vendor", seller(email))).status).toBe(201);
    const before = await db.collection("otps").findOne({ email });

    expect((await resend(email)).status).toBe(200);

    const after = await db.collection("otps").findOne({ email });
    expect(after!._id).not.toEqual(before!._id); // a new pending sign-up, with a new code
    for (const field of [
      "pendingName", "pendingPassword", "pendingRole", "pendingPhone", "pendingShopName", "pendingShopDescription",
      "pendingStreet", "pendingCity", "pendingState", "pendingPincode", "pendingGstNumber", "pendingPanNumber",
    ]) {
      expect(after![field], field).toBe(before![field]);
      expect(after![field], field).toBeTruthy();
    }
  });

  it("the seller is created WITH their shop, and the seller area can load", async () => {
    const email = "shop@resend.test";
    await post(routes.registerVendor, "/api/auth/register-vendor", seller(email));
    await resend(email);

    const verified = await post(routes.verify, "/api/auth/verify-otp", { email, otp: latestCode(email) });
    expect(verified).toMatchObject({ status: 200, body: { role: "shop_owner" } });

    const user = await db.collection("users").findOne({ email });
    expect(user).toMatchObject({ role: "shop_owner", phone: "9876543210" });
    expect(user!.shopId).toBeTruthy();

    const shop = await db.collection("shops").findOne({ ownerId: user!._id });
    expect(shop).toMatchObject({
      _id: user!.shopId,
      shopName: "Asha Handlooms",
      description: "Handwoven sarees",
      address: { street: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
      contactInfo: { phone: "9876543210", email },
      isApproved: false,
    });

    // What the mobile app does next: sign in and ask what is open to this seller.
    const login = await post(routes.login, "/api/mobile-auth/login", { email, password: PASSWORD });
    expect(login.body.user).toMatchObject({ role: "shop_owner", shopId: String(shop!._id) });
    const status = await call(routes.vendorStatus, "/api/vendor/status", { bearer: login.body.accessToken });
    expect(status).toMatchObject({ status: 200, body: { success: true, isApproved: false, blockingCode: "MOU_REQUIRED" } });
  });

  it("still works after tapping Resend more than once", async () => {
    const email = "twice@resend.test";
    await post(routes.registerVendor, "/api/auth/register-vendor", seller(email));
    await resend(email);
    await resend(email);

    await post(routes.verify, "/api/auth/verify-otp", { email, otp: latestCode(email) });

    const user = await db.collection("users").findOne({ email });
    expect(await db.collection("shops").countDocuments({ ownerId: user!._id, shopName: "Asha Handlooms" })).toBe(1);
  });

  it("only the newest code works", async () => {
    const email = "newest@resend.test";
    await post(routes.registerVendor, "/api/auth/register-vendor", seller(email));
    await resend(email);
    const [first, second] = emailedCodes(email);
    expect(second).toBeDefined();

    if (first !== second) {
      expect((await post(routes.verify, "/api/auth/verify-otp", { email, otp: first })).status).toBe(400);
    }
    expect((await post(routes.verify, "/api/auth/verify-otp", { email, otp: second })).status).toBe(200);
  });
});

describe("customer sign-up: Resend code", () => {
  it("creates a customer account and no shop", async () => {
    const email = "customer@resend.test";
    const body = { name: "Ravi Kumar", email, password: PASSWORD, confirmPassword: PASSWORD };
    expect((await post(routes.register, "/api/auth/register", body)).status).toBe(201);
    expect((await resend(email)).status).toBe(200);

    const verified = await post(routes.verify, "/api/auth/verify-otp", { email, otp: latestCode(email) });
    expect(verified).toMatchObject({ status: 200, body: { role: "user" } });

    const user = await db.collection("users").findOne({ email });
    expect(user).toMatchObject({ role: "user", name: "Ravi Kumar" });
    expect(user!.shopId ?? null).toBeNull();
    expect(await db.collection("shops").countDocuments({ ownerId: user!._id })).toBe(0);
  });
});
