// GET /api/wishlist when a wishlisted product has since been deleted.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let GET: typeof import("@/app/api/wishlist/route").GET;
let bearer: string;

const oid = () => new mongoose.Types.ObjectId();
const ids = { user: oid(), product: oid(), goneProduct: oid(), keptItem: oid(), danglingItem: oid() };

beforeAll(async () => {
  db = await startTestDb();
  const { signAccessToken } = await import("@/lib/mobile-tokens");
  ({ GET } = await import("@/app/api/wishlist/route"));
  await initModels();

  await db.collection("users").insertOne({ _id: ids.user, email: "wish@example.com", name: "Wish", role: "user", isActive: true, isVerified: true });
  await db.collection("products").insertOne({ _id: ids.product, name: "Face Wash", price: 250, images: ["/face-wash.jpg"] });
  await db.collection("wishlists").insertMany([
    { _id: ids.keptItem, userId: ids.user, productId: ids.product },
    // This product was deleted after it was wishlisted.
    { _id: ids.danglingItem, userId: ids.user, productId: ids.goneProduct },
  ]);

  bearer = signAccessToken({ id: String(ids.user), email: "wish@example.com", name: "Wish", role: "user", shopId: null }, "fam").token;
});
afterAll(stopTestDb);

describe("GET /api/wishlist", () => {
  it("returns 200 and leaves out an item whose product was deleted", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await call(GET, "/api/wishlist", { bearer });
    const warnings = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.startsWith("[wishlist]"));
    warn.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { _id: String(ids.keptItem), productId: String(ids.product), name: "Face Wash", price: 250, image: "/face-wash.jpg" },
    ]);
    // One warning per skipped item, naming the wishlist item and the user.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(String(ids.danglingItem));
    expect(warnings[0]).toContain(String(ids.user));
    // Reading does not delete anything.
    expect(await db.collection("wishlists").countDocuments({ userId: ids.user })).toBe(2);
  });

  it("is unchanged for a signed-out caller", async () => {
    expect(await call(GET, "/api/wishlist")).toMatchObject({ status: 401 });
  });
});
