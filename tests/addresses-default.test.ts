// The default address (/api/addresses, /api/addresses/:id), against an
// in-memory MongoDB.
//
// Regression: PATCH (and PUT / POST with isDefault) used to clear the user's
// default address BEFORE doing their own write. When that write then found
// nothing (an id that isn't the user's, a malformed id) or failed, the request
// answered with an error and the user was left with no default address.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call, type CallOptions } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let collection: typeof import("@/app/api/addresses/route");
let item: typeof import("@/app/api/addresses/[id]/route");

const oid = () => new mongoose.Types.ObjectId();
const asha = { _id: oid(), email: "asha@addresses.test", token: "" };
const ravi = { _id: oid(), email: "ravi@addresses.test", token: "" };
const fields = { name: "Asha", phone: "9876543210", street: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001" };

// Seeded fresh for each test: Asha has a default (Home) and one other (Work); Ravi has a default.
let home: mongoose.Types.ObjectId, work: mongoose.Types.ObjectId, ravisHome: mongoose.Types.ObjectId;

const list = async (user: typeof asha) => (await call(collection.GET, "/api/addresses", { bearer: user.token })).body as any[];
const defaultsOf = async (user: typeof asha) => (await list(user)).filter((a) => a.isDefault).map((a) => String(a._id));
const onItem = (method: "PATCH" | "PUT", id: string, opts: CallOptions) =>
  call(item[method], `/api/addresses/${id}`, { method, ...opts, params: { id } });
/** Like onItem, for requests the route may answer by throwing (an unhandled 500). */
const statusOf = (request: Promise<{ status: number }>) => request.then((r) => r.status, () => 500);

beforeAll(async () => {
  db = await startTestDb();
  collection = await import("@/app/api/addresses/route");
  item = await import("@/app/api/addresses/[id]/route");
  const { signAccessToken } = await import("@/lib/mobile-tokens");
  await initModels();
  for (const user of [asha, ravi]) {
    await db.collection("users").insertOne({ _id: user._id, email: user.email, name: "Test", role: "user", isActive: true, isVerified: true, pushTokens: [] });
    user.token = signAccessToken({ id: String(user._id), email: user.email, name: "Test", role: "user", shopId: null }, "test").token;
  }
});
afterAll(stopTestDb);

beforeEach(async () => {
  await db.collection("addresses").deleteMany({});
  [home, work, ravisHome] = [oid(), oid(), oid()];
  const now = new Date();
  await db.collection("addresses").insertMany([
    { _id: home, userId: asha._id, label: "Home", isDefault: true, ...fields, createdAt: now, updatedAt: now },
    { _id: work, userId: asha._id, label: "Work", isDefault: false, ...fields, createdAt: now, updatedAt: now },
    { _id: ravisHome, userId: ravi._id, label: "Home", isDefault: true, ...fields, name: "Ravi", createdAt: now, updatedAt: now },
  ]);
});

describe("PATCH /api/addresses/:id (set default)", () => {
  it("makes the address the user's only default", async () => {
    const res = await onItem("PATCH", String(work), { bearer: asha.token });
    expect(res).toMatchObject({ status: 200, body: { _id: String(work), isDefault: true } });
    expect(await defaultsOf(asha)).toEqual([String(work)]);
    expect(await defaultsOf(ravi)).toEqual([String(ravisHome)]); // other users are untouched
  });

  it.each([
    ["an id that does not exist", () => String(oid())],
    ["another user's address", () => String(ravisHome)],
    ["a malformed id", () => "not-an-id"],
  ])("%s → 404, and the user keeps their default address", async (_case, id) => {
    expect(await statusOf(onItem("PATCH", id(), { bearer: asha.token }))).toBe(404);
    expect(await defaultsOf(asha)).toEqual([String(home)]);
    expect(await defaultsOf(ravi)).toEqual([String(ravisHome)]);
  });
});

describe("PUT /api/addresses/:id (edit)", () => {
  it("with isDefault: true, updates the address and makes it the only default", async () => {
    const res = await onItem("PUT", String(work), { bearer: asha.token, body: { city: "Mumbai", isDefault: true } });
    expect(res).toMatchObject({ status: 200, body: { _id: String(work), city: "Mumbai", isDefault: true } });
    expect(await defaultsOf(asha)).toEqual([String(work)]);
  });

  it("without isDefault, changes the fields and leaves the default alone", async () => {
    const res = await onItem("PUT", String(work), { bearer: asha.token, body: { city: "Mumbai" } });
    expect(res).toMatchObject({ status: 200, body: { city: "Mumbai", isDefault: false } });
    expect(await defaultsOf(asha)).toEqual([String(home)]);
  });

  it.each([
    ["an id that does not exist", () => String(oid())],
    ["another user's address", () => String(ravisHome)],
    ["a malformed id", () => "not-an-id"],
  ])("isDefault: true on %s → 404, and the user keeps their default address", async (_case, id) => {
    expect(await statusOf(onItem("PUT", id(), { bearer: asha.token, body: { city: "Mumbai", isDefault: true } }))).toBe(404);
    expect(await defaultsOf(asha)).toEqual([String(home)]);
    expect((await list(ravi))[0]).toMatchObject({ city: "Pune", isDefault: true }); // not edited either
  });
});

describe("PUT /api/addresses/:id: only address fields can be changed", () => {
  // Regression: the body used to be passed to the database update as it was,
  // so a request could set `userId` and move its address into someone else's
  // account, marked as their default delivery address.
  const ownerOf = async (id: mongoose.Types.ObjectId) => String((await db.collection("addresses").findOne({ _id: id }))!.userId);

  it("cannot move the address into another user's account", async () => {
    const body = { userId: String(ravi._id), isDefault: true, street: "1 Elsewhere" };
    expect(await statusOf(onItem("PUT", String(work), { bearer: asha.token, body }))).toBe(200);

    expect(await ownerOf(work)).toBe(String(asha._id));
    expect((await list(asha)).find((a) => String(a._id) === String(work))).toMatchObject({ street: "1 Elsewhere", isDefault: true });
    // Ravi's addresses are exactly as they were.
    expect(await list(ravi)).toHaveLength(1);
    expect(await defaultsOf(ravi)).toEqual([String(ravisHome)]);
  });

  it("ignores update operators and fields that are not part of an address", async () => {
    const body = { $set: { userId: String(ravi._id) }, _id: String(oid()), createdAt: "2000-01-01T00:00:00.000Z", city: "Mumbai" };
    expect(await statusOf(onItem("PUT", String(work), { bearer: asha.token, body }))).toBe(200);

    const stored = await db.collection("addresses").findOne({ _id: work });
    expect(String(stored!.userId)).toBe(String(asha._id));
    expect(stored!.city).toBe("Mumbai"); // the one real address field was applied
    expect(new Date(stored!.createdAt).getFullYear()).toBeGreaterThan(2000);
    expect(await list(ravi)).toHaveLength(1);
  });

  it("ignores values that are not text", async () => {
    const body = { name: { $ne: null }, street: ["a"], city: "Mumbai" };
    expect(await statusOf(onItem("PUT", String(work), { bearer: asha.token, body }))).toBe(200);
    expect(await db.collection("addresses").findOne({ _id: work })).toMatchObject({ name: fields.name, street: fields.street, city: "Mumbai" });
  });
});

describe("POST /api/addresses (add)", () => {
  it("with isDefault: true, the new address becomes the only default", async () => {
    const res = await call(collection.POST, "/api/addresses", { bearer: asha.token, body: { ...fields, label: "Other", isDefault: true } });
    expect(res.status).toBe(201);
    expect(await defaultsOf(asha)).toEqual([String(res.body._id)]);
  });

  it("an address that fails validation is not saved, and the user keeps their default address", async () => {
    const invalid = { ...fields, name: undefined, isDefault: true }; // name is required
    expect(await statusOf(call(collection.POST, "/api/addresses", { bearer: asha.token, body: invalid }))).toBeGreaterThanOrEqual(400);
    expect(await list(asha)).toHaveLength(2);
    expect(await defaultsOf(asha)).toEqual([String(home)]);
  });
});
