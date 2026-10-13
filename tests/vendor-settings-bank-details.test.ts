// PUT /api/vendor/settings as the web settings form calls it: the form
// always sends bankDetails, blank when the vendor has not entered any yet
// (app/vendor/settings/page.tsx). Against an in-memory MongoDB.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let route: typeof import("@/app/api/vendor/settings/route");
let CURRENT_MOU_VERSION: string;
let seq = 0;

const BANK = { accountHolderName: "Asha Rao", accountNumber: "123456789012", ifscCode: "HDFC0001234", bankName: "HDFC Bank", swiftCode: "", upiId: "asha@upi" };
// What the form holds for a vendor with no bank details on file.
const BLANK_BANK = { accountHolderName: "", accountNumber: "", ifscCode: "", bankName: "", swiftCode: "", upiId: "" };

async function makeVendor(shop: Record<string, unknown> = {}) {
  const n = ++seq;
  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  await db.collection("users").insertOne({ _id: userId, email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", isActive: true, isVerified: true, shopId });
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: userId, shopName: `Shop ${n}`, slug: `shop-${n}`, description: "", isApproved: true, isActive: true, commissionRate: 10,
    address: { street: "s", city: "c", state: "st", pincode: "400001", country: "India" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    ...shop,
  });
  await db.collection("vendormouacceptances").insertOne({ userId, shopId, mouVersion: CURRENT_MOU_VERSION, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
  auth.session = { user: { id: String(userId), email: `v${n}@example.com`, name: `V${n}`, role: "shop_owner", shopId: String(shopId) } };
  return { shopId };
}

/** The body the web form sends: everything it loaded, with the edits applied. */
async function formBody(edits: Record<string, unknown> = {}) {
  const { body } = await call(route.GET, "/api/vendor/settings");
  const shop = body.shop;
  return {
    shopName: shop.shopName || "",
    contactInfo: shop.contactInfo || { phone: "", email: "" },
    address: shop.address,
    bankDetails: shop.bankDetails || BLANK_BANK,
    commissionRate: shop.commissionRate || 10,
    ...edits,
  };
}
const put = (body: unknown) => call(route.PUT, "/api/vendor/settings", { method: "PUT", body });
const shopDoc = async (shopId: mongoose.Types.ObjectId) => (await db.collection("shops").findOne({ _id: shopId }))!;

beforeAll(async () => {
  db = await startTestDb();
  ({ CURRENT_MOU_VERSION } = await import("@/lib/mou-content"));
  route = await import("@/app/api/vendor/settings/route");
  await initModels();
});

afterAll(async () => {
  await stopTestDb();
});

beforeEach(() => {
  auth.session = null;
});

describe("PUT /api/vendor/settings from the web form", () => {
  it("saves the shop profile for a vendor who has no bank details yet", async () => {
    const vendor = await makeVendor();
    const body = await formBody({ shopName: "Renamed Shop" });
    expect(body.bankDetails).toEqual(BLANK_BANK);

    const res = await put(body);

    expect(res.status).toBe(200);
    const shop = await shopDoc(vendor.shopId);
    expect(shop.shopName).toBe("Renamed Shop");
    // Blank bank details are "not provided": nothing is written for them.
    expect(Object.values(shop.bankDetails ?? {}).filter(Boolean)).toEqual([]);
  });

  it("leaves bank details on file untouched when the form sends them blank", async () => {
    const vendor = await makeVendor({ bankDetails: BANK });

    const res = await put({ shopName: "Renamed Shop", bankDetails: { ...BLANK_BANK, upiId: "   " } });

    expect(res.status).toBe(200);
    const shop = await shopDoc(vendor.shopId);
    expect(shop.shopName).toBe("Renamed Shop");
    expect(shop.bankDetails).toMatchObject(BANK);
  });

  it("still validates bank details once any of them is filled in", async () => {
    const vendor = await makeVendor();

    const partial = await put({ shopName: "Renamed Shop", bankDetails: { ...BLANK_BANK, upiId: "asha@upi" } });
    expect(partial.status).toBe(400);
    expect(partial.body.message).toBe("Account holder name and bank name are required");

    const badIfsc = await put({ bankDetails: { ...BANK, ifscCode: "NOPE" } });
    expect(badIfsc.status).toBe(400);
    expect((await shopDoc(vendor.shopId)).shopName).not.toBe("Renamed Shop");

    const complete = await put({ bankDetails: BANK });
    expect(complete.status).toBe(200);
    expect((await shopDoc(vendor.shopId)).bankDetails).toMatchObject(BANK);
  });
});
