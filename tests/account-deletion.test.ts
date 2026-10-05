// DELETE /api/users/me — self-service account deletion.

import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let DEL: typeof import("@/app/api/users/me/route").DELETE;
let login: typeof import("@/app/api/mobile-auth/login/route").POST;
let refresh: typeof import("@/app/api/mobile-auth/refresh/route").POST;
let exitRoute: typeof import("@/app/api/vendor/exit/route").POST;

const PW = "account-password";
let seq = 0;
async function makeUser(over: Record<string, unknown> = {}) {
  const _id = new mongoose.Types.ObjectId();
  const email = `del${++seq}@example.com`;
  await db.collection("users").insertOne({
    _id, email, name: "Real Name", phone: "9999999999", role: "user", isActive: true, isVerified: true,
    password: await hash(PW, 4), pushTokens: ["ExponentPushToken[x]"], address: { city: "Mumbai" }, ...over,
  });
  const t = (await call(login, "/api/mobile-auth/login", { body: { email, password: PW } })).body;
  return { _id, email, access: t.accessToken as string, refresh: t.refreshToken as string };
}
const del = (bearer: string, body: unknown = { confirm: "DELETE", password: PW }) =>
  call(DEL, "/api/users/me", { method: "DELETE", bearer, body });

beforeAll(async () => {
  db = await startTestDb();
  ({ DELETE: DEL } = await import("@/app/api/users/me/route"));
  ({ POST: login } = await import("@/app/api/mobile-auth/login/route"));
  ({ POST: refresh } = await import("@/app/api/mobile-auth/refresh/route"));
  ({ POST: exitRoute } = await import("@/app/api/vendor/exit/route"));
  for (const m of ["wallet", "ledger", "payout", "audit-log"]) await import(`@/lib/models/${m}`);
  await initModels();
});
afterAll(stopTestDb);

describe("DELETE /api/users/me", () => {
  it("anonymizes the user, deletes personal data, keeps orders, revokes refresh tokens", async () => {
    const u = await makeUser();
    const productId = new mongoose.Types.ObjectId();
    await db.collection("addresses").insertOne({ userId: u._id, street: "1 St" });
    await db.collection("carts").insertOne({ userId: u._id, items: [] });
    await db.collection("wishlists").insertOne({ userId: u._id, productId });
    await db.collection("favourites").insertOne({ userId: String(u._id), type: "product", refId: String(productId) });
    await db.collection("reviews").insertOne({ user: u._id, product: productId, userName: "Real Name", userEmail: u.email, rating: 5 });
    await db.collection("orders").insertOne({ orderNumber: `ORD-D${seq}`, user: u._id, orderStatus: "delivered", items: [], totalAmount: 10 });
    await db.collection("razorpaycheckouts").insertOne({ userId: u._id, razorpayOrderId: `o${seq}`, status: "fulfilled", shippingAddress: { street: "1 St" } });
    await db.collection("otps").insertOne({ email: u.email, otp: "x" });

    expect(await del(u.access)).toMatchObject({ status: 200, body: { success: true } });

    const doc = await db.collection("users").findOne({ _id: u._id });
    expect(doc).toMatchObject({ email: `deleted-${u._id}@deleted.invalid`, name: "Deleted user", isActive: false, isVerified: false, pushTokens: [] });
    expect(doc?.deletedAt).toBeInstanceOf(Date);
    for (const k of ["password", "phone", "address", "locale"]) expect(doc).not.toHaveProperty(k);
    for (const c of ["addresses", "carts", "wishlists"]) expect(await db.collection(c).countDocuments({ userId: u._id })).toBe(0);
    expect(await db.collection("favourites").countDocuments({ userId: String(u._id) })).toBe(0);
    expect(await db.collection("otps").countDocuments({ email: u.email })).toBe(0);
    expect(await db.collection("reviews").findOne({ user: u._id })).toMatchObject({ userName: "Deleted user", userEmail: "" });
    expect(await db.collection("orders").countDocuments({ user: u._id })).toBe(1);
    expect((await db.collection("razorpaycheckouts").findOne({ userId: u._id }))?.shippingAddress).toBeUndefined();
    expect(await db.collection("auditlogs").countDocuments({ action: "ACCOUNT_DELETED", targetId: String(u._id) })).toBe(1);

    expect(await call(refresh, "/api/mobile-auth/refresh", { body: { refreshToken: u.refresh } })).toMatchObject({ status: 401 });
    expect(await call(login, "/api/mobile-auth/login", { body: { email: u.email, password: PW } })).toMatchObject({ status: 401 });
    // The old email can register again (it is free), and a repeat delete is refused.
    expect(await db.collection("users").countDocuments({ email: u.email })).toBe(0);
    expect(await del(u.access)).toMatchObject({ status: 401 });
  });

  it("requires confirmation and the password", async () => {
    const u = await makeUser();
    expect(await del(u.access, {})).toMatchObject({ status: 400, body: { code: "CONFIRMATION_REQUIRED" } });
    expect(await del(u.access, { confirm: "yes" })).toMatchObject({ status: 400, body: { code: "CONFIRMATION_REQUIRED" } });
    expect(await del(u.access, { confirm: "DELETE" })).toMatchObject({ status: 403, body: { code: "INVALID_CREDENTIALS" } });
    expect(await del(u.access, { confirm: "DELETE", password: "wrong" })).toMatchObject({ status: 403, body: { code: "INVALID_CREDENTIALS" } });
    expect(await call(DEL, "/api/users/me", { method: "DELETE", body: { confirm: "DELETE" } })).toMatchObject({ status: 401, body: { code: "UNAUTHORIZED" } });
    expect((await db.collection("users").findOne({ _id: u._id }))?.isActive).toBe(true);
  });

  it("rate-limits password attempts", async () => {
    const u = await makeUser();
    for (let i = 0; i < 5; i++) await del(u.access, { confirm: "DELETE", password: "wrong" });
    expect(await del(u.access)).toMatchObject({ status: 429, body: { code: "RATE_LIMITED" } });
  });

  it("Google-only account (no password) deletes with confirmation alone", async () => {
    const u = await makeUser();
    await db.collection("users").updateOne({ _id: u._id }, { $unset: { password: 1 } });
    expect(await del(u.access, { confirm: "DELETE" })).toMatchObject({ status: 200 });
  });

  it("blocks with open orders (as buyer), then allows once delivered", async () => {
    const u = await makeUser();
    const { insertedId } = await db.collection("orders").insertOne({ orderNumber: `ORD-S${seq}`, user: u._id, orderStatus: "shipped", items: [] });
    expect(await del(u.access)).toMatchObject({ status: 409, body: { code: "OPEN_ORDERS", openOrders: 1 } });
    await db.collection("orders").updateOne({ _id: insertedId }, { $set: { orderStatus: "delivered" } });
    expect((await del(u.access)).status).toBe(200);
  });

  async function makeVendor(bank = false) {
    const shopId = new mongoose.Types.ObjectId();
    const v = await makeUser({ role: "shop_owner", shopId });
    await db.collection("shops").insertOne({
      _id: shopId, ownerId: v._id, shopName: "V", slug: `v-${seq}`, isActive: true, isApproved: true,
      ...(bank ? { bankDetails: { accountNumber: "123456789012", ifscCode: "HDFC0001234", bankName: "HDFC" } } : {}),
    });
    const wallet = await db.collection("wallets").insertOne({ shopId, type: "VENDOR", status: "ACTIVE", pendingBalance: 0, withdrawableBalance: 0, frozenBalance: 0 });
    return { ...v, shopId, walletId: wallet.insertedId };
  }

  it("vendor: goes through the vendor exit rules — open orders, frozen wallet, pending sales, payout in flight, bank details", async () => {
    const v = await makeVendor();
    const order = await db.collection("orders").insertOne({ orderNumber: `ORD-V${seq}`, user: new mongoose.Types.ObjectId(), orderStatus: "processing", items: [{ shopId: v.shopId }] });
    expect(await del(v.access)).toMatchObject({ status: 409, body: { code: "OPEN_ORDERS" } });
    await db.collection("orders").updateOne({ _id: order.insertedId }, { $set: { orderStatus: "cancelled" } });

    await db.collection("wallets").updateOne({ _id: v.walletId }, { $set: { status: "FROZEN" } });
    expect(await del(v.access)).toMatchObject({ status: 409, body: { code: "WALLET_FROZEN" } });
    await db.collection("wallets").updateOne({ _id: v.walletId }, { $set: { status: "ACTIVE" } });

    const sale = await db.collection("ledgerentries").insertOne({ accountId: v.walletId, shopId: v.shopId, type: "SALE", status: "PENDING", amount: 90, transactionId: `t${seq}` });
    expect(await del(v.access)).toMatchObject({ status: 409, body: { code: "PENDING_SALES" } });
    await db.collection("ledgerentries").deleteOne({ _id: sale.insertedId });

    const payout = await db.collection("payouts").insertOne({ shopId: v.shopId, amount: 600, status: "REQUESTED", idempotencyKey: `p${seq}` });
    expect(await del(v.access)).toMatchObject({ status: 409, body: { code: "PAYOUT_IN_PROGRESS" } });
    await db.collection("payouts").updateOne({ _id: payout.insertedId }, { $set: { status: "COMPLETED" } });

    await db.collection("wallets").updateOne({ _id: v.walletId }, { $set: { withdrawableBalance: 250 } });
    expect(await del(v.access)).toMatchObject({ status: 409, body: { code: "BANK_DETAILS_REQUIRED" } });
    // Nothing was closed by the refused attempts.
    expect((await db.collection("wallets").findOne({ _id: v.walletId }))?.status).toBe("ACTIVE");
    expect((await db.collection("users").findOne({ _id: v._id }))?.isActive).toBe(true);
  });

  it("vendor: success settles the balance, archives the shop, closes the wallet, then anonymizes the user", async () => {
    const v = await makeVendor(true);
    await db.collection("wallets").updateOne({ _id: v.walletId }, { $set: { withdrawableBalance: 250 } });

    expect((await del(v.access)).status).toBe(200);
    expect(await db.collection("payouts").find({ shopId: v.shopId, isExitSettlement: true }).toArray()).toMatchObject([{ amount: 250, status: "REQUESTED" }]);
    expect(await db.collection("shops").findOne({ _id: v.shopId })).toMatchObject({ isActive: false, isApproved: false, rejectionReason: "Vendor Voluntarily Exited" });
    expect((await db.collection("wallets").findOne({ _id: v.walletId }))?.status).toBe("CLOSED");
    expect(await db.collection("auditlogs").countDocuments({ action: "VENDOR_EXIT_COMPLETED", shopId: v.shopId })).toBe(1);
    expect((await db.collection("users").findOne({ _id: v._id }))?.name).toBe("Deleted user");
  });

  it("vendor who already exited via /api/vendor/exit: deletion does not create a second settlement", async () => {
    const v = await makeVendor(true);
    await db.collection("wallets").updateOne({ _id: v.walletId }, { $set: { withdrawableBalance: 300 } });
    const exit = await call(exitRoute, "/api/vendor/exit", { method: "POST", bearer: v.access });
    expect(exit).toMatchObject({ status: 200, body: { success: true, message: expect.stringContaining("Final settlement") } });
    // Admin settles it outside the ledger (as exit settlements are today).
    await db.collection("payouts").updateMany({ shopId: v.shopId }, { $set: { status: "COMPLETED" } });

    expect((await del(v.access)).status).toBe(200);
    expect(await db.collection("payouts").countDocuments({ shopId: v.shopId, isExitSettlement: true })).toBe(1);
    // Repeating the exit itself is also safe (the access token lives ≤15 min).
    expect(await call(exitRoute, "/api/vendor/exit", { method: "POST", bearer: v.access })).toMatchObject({ status: 200, body: { message: "Your account has already been closed." } });
    expect(await db.collection("payouts").countDocuments({ shopId: v.shopId, isExitSettlement: true })).toBe(1);
  });

  it("admins cannot self-delete", async () => {
    const a = await makeUser({ role: "admin" });
    expect(await del(a.access)).toMatchObject({ status: 403, body: { code: "FORBIDDEN" } });
  });
});

describe("POST /api/vendor/exit (now lib/vendor-exit.ts)", () => {
  const exit = (bearer: string) => call(exitRoute, "/api/vendor/exit", { method: "POST", bearer });

  it("keeps its messages and statuses, adds codes, and is idempotent", async () => {
    const shopId = new mongoose.Types.ObjectId();
    const v = await makeUser({ role: "shop_owner", shopId });
    await db.collection("shops").insertOne({ _id: shopId, ownerId: v._id, shopName: "E", slug: `e-${seq}`, isActive: true, isApproved: true });
    const wallet = await db.collection("wallets").insertOne({ shopId, type: "VENDOR", status: "FROZEN", withdrawableBalance: 0, pendingBalance: 0 });
    expect(await exit(v.access)).toMatchObject({ status: 400, body: { code: "WALLET_FROZEN", error: expect.stringContaining("frozen") } });
    await db.collection("wallets").updateOne({ _id: wallet.insertedId }, { $set: { status: "ACTIVE" } });

    expect(await exit(v.access)).toMatchObject({ status: 200, body: { success: true, message: "Your account has been closed successfully." } });
    expect(await exit(v.access)).toMatchObject({ status: 200, body: { success: true, message: "Your account has already been closed." } });
    expect(await db.collection("auditlogs").countDocuments({ action: "VENDOR_EXIT_COMPLETED", shopId })).toBe(1);
  });

  it("no wallet: closes the shop directly; no shop: 404", async () => {
    const shopId = new mongoose.Types.ObjectId();
    const v = await makeUser({ role: "shop_owner", shopId });
    await db.collection("shops").insertOne({ _id: shopId, ownerId: v._id, shopName: "N", slug: `n-${seq}`, isActive: true, isApproved: true });
    expect(await exit(v.access)).toMatchObject({ status: 200, body: { message: "Account closed successfully." } });
    expect(await exit(v.access)).toMatchObject({ status: 200, body: { message: "Your account has already been closed." } });
    const customer = await makeUser();
    expect(await exit(customer.access)).toMatchObject({ status: 404, body: { code: "SHOP_NOT_FOUND" } });
  });
});
