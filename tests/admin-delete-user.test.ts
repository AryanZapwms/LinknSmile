// DELETE /api/users/:id — the admin "delete user" action. A user who has
// orders is anonymized (lib/account-deletion.ts) so the orders keep a
// customer to point at; a user with no orders is removed as before.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let DEL: typeof import("@/app/api/users/[id]/route").DELETE;

const oid = () => new mongoose.Types.ObjectId();
const adminId = oid();
const adminSession = { user: { id: String(adminId), email: "admin@example.com", name: "Admin", role: "admin" } };

let seq = 0;
async function makeUser(over: Record<string, unknown> = {}) {
  const _id = oid();
  const email = `customer${++seq}@example.com`;
  await db.collection("users").insertOne({
    _id, email, name: "Real Name", phone: "9999999999", role: "user", isActive: true, isVerified: true,
    password: "hashed", pushTokens: ["ExponentPushToken[x]"], address: { city: "Mumbai" }, ...over,
  });
  return { _id, email };
}
const del = (id: mongoose.Types.ObjectId | string) =>
  call(DEL, `/api/users/${id}`, { method: "DELETE", params: { id: String(id) } });

beforeAll(async () => {
  db = await startTestDb();
  ({ DELETE: DEL } = await import("@/app/api/users/[id]/route"));
  await initModels();
  await db.collection("users").insertOne({ _id: adminId, email: "admin@example.com", name: "Admin", role: "admin", isActive: true, isVerified: true });
});
afterAll(stopTestDb);
beforeEach(() => {
  auth.session = adminSession;
});

describe("DELETE /api/users/:id (admin)", () => {
  it("anonymizes a user who has orders instead of deleting, and keeps the orders", async () => {
    const u = await makeUser();
    const productId = oid();
    await db.collection("addresses").insertOne({ userId: u._id, street: "1 St" });
    await db.collection("carts").insertOne({ userId: u._id, items: [] });
    await db.collection("wishlists").insertOne({ userId: u._id, productId });
    await db.collection("reviews").insertOne({ user: u._id, product: productId, userName: "Real Name", userEmail: u.email, rating: 5 });
    const { insertedId: orderId } = await db.collection("orders").insertOne({ orderNumber: `ORD-ADM${seq}`, user: u._id, orderStatus: "delivered", items: [], totalAmount: 10 });

    const res = await del(u._id);
    expect(res).toMatchObject({ status: 200, body: { anonymized: true } });

    // The user document is still there, anonymized and deactivated.
    const doc = await db.collection("users").findOne({ _id: u._id });
    expect(doc).toMatchObject({ email: `deleted-${u._id}@deleted.invalid`, name: "Deleted user", isActive: false, isVerified: false, pushTokens: [] });
    expect(doc?.deletedAt).toBeInstanceOf(Date);
    for (const k of ["password", "phone", "address"]) expect(doc).not.toHaveProperty(k);

    // The order is untouched and its customer still resolves.
    const { Order } = await import("@/lib/models/order");
    const order = await Order.findById(orderId).populate("user", "name email").lean<any>();
    expect(order?.user).toMatchObject({ name: "Deleted user" });

    // Personal data goes the same way as in self-service deletion.
    for (const c of ["addresses", "carts", "wishlists"]) expect(await db.collection(c).countDocuments({ userId: u._id })).toBe(0);
    expect(await db.collection("reviews").findOne({ user: u._id })).toMatchObject({ userName: "Deleted user", userEmail: "" });

    // The audit entry names the admin, not the user.
    const audit = await db.collection("auditlogs").find({ action: "ACCOUNT_DELETED", targetId: String(u._id) }).toArray();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ performedBy: String(adminId) });
    expect(audit[0].reason).toMatch(/admin/i);
  });

  it("is safe to repeat: a second delete changes nothing", async () => {
    const u = await makeUser();
    await db.collection("orders").insertOne({ orderNumber: `ORD-ADM${seq}`, user: u._id, orderStatus: "delivered", items: [], totalAmount: 10 });

    expect(await del(u._id)).toMatchObject({ status: 200, body: { anonymized: true } });
    const first = await db.collection("users").findOne({ _id: u._id });

    expect(await del(u._id)).toMatchObject({ status: 200, body: { anonymized: true } });
    expect(await db.collection("users").findOne({ _id: u._id })).toEqual(first);
    expect(await db.collection("auditlogs").countDocuments({ action: "ACCOUNT_DELETED", targetId: String(u._id) })).toBe(1);
  });

  it("anonymizes for an open order too (any order counts, not only finished ones)", async () => {
    const u = await makeUser();
    await db.collection("orders").insertOne({ orderNumber: `ORD-ADM${seq}`, user: u._id, orderStatus: "pending", items: [], totalAmount: 10 });
    expect(await del(u._id)).toMatchObject({ status: 200, body: { anonymized: true } });
    expect(await db.collection("users").countDocuments({ _id: u._id })).toBe(1);
  });

  it("still hard-deletes a user with no orders", async () => {
    const u = await makeUser();
    const res = await del(u._id);
    expect(res).toMatchObject({ status: 200, body: { message: "User deleted successfully" } });
    expect(res.body).not.toHaveProperty("anonymized");
    expect(await db.collection("users").countDocuments({ _id: u._id })).toBe(0);
  });

  it("keeps the admin check and the 404", async () => {
    const u = await makeUser();
    await db.collection("orders").insertOne({ orderNumber: `ORD-ADM${seq}`, user: u._id, orderStatus: "delivered", items: [], totalAmount: 10 });

    auth.session = { user: { id: String(u._id), email: u.email, name: "Real Name", role: "user" } };
    expect(await del(u._id)).toMatchObject({ status: 403 });
    auth.session = null;
    expect(await del(u._id)).toMatchObject({ status: 403 });
    expect(await db.collection("users").findOne({ _id: u._id })).toMatchObject({ email: u.email, name: "Real Name", isActive: true });

    auth.session = adminSession;
    expect(await del(oid())).toMatchObject({ status: 404 });
  });
});
