// GET /api/products: server-side search, featured (hero products),
// limit clamp and pagination.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let GET: typeof import("@/app/api/products/route").GET;
let productsContract: typeof import("@/lib/contracts/products");

const shopId = new mongoose.Types.ObjectId();
const ids: mongoose.Types.ObjectId[] = [];
const list = (query: Record<string, string | number | boolean>) => call(GET, "/api/products", { query });

beforeAll(async () => {
  db = await startTestDb();
  ({ GET } = await import("@/app/api/products/route"));
  productsContract = await import("@/lib/contracts/products");
  await import("@/lib/models/hero-product");
  await initModels();
  await db.collection("shops").insertOne({ _id: shopId, shopName: "S", slug: "s", ownerId: new mongoose.Types.ObjectId() });
  const docs = Array.from({ length: 130 }, (_, i) => {
    const _id = new mongoose.Types.ObjectId();
    ids.push(_id);
    return {
      _id, shopId, price: 100 + i, stock: 5, isActive: true, approvalStatus: "approved",
      name: i === 7 ? "Rose (Shampoo) 200ml" : i === 8 ? "rosewater toner" : `Item ${i}`,
      slug: `item-${i}`, createdAt: new Date(Date.UTC(2026, 0, 1) + i * 1000),
    };
  });
  docs.push({ ...docs[0], _id: new mongoose.Types.ObjectId(), name: "Rose hidden", slug: "hidden", isActive: false } as any);
  await db.collection("products").insertMany(docs);
  // Hero order: 12, 3, 50 (and one inactive hero).
  await db.collection("heroproducts").insertMany([
    { productId: ids[12], sortOrder: 0, isActive: true, createdAt: new Date() },
    { productId: ids[3], sortOrder: 1, isActive: true, createdAt: new Date() },
    { productId: ids[50], sortOrder: 2, isActive: true, createdAt: new Date() },
    { productId: ids[60], sortOrder: 3, isActive: false, createdAt: new Date() },
  ]);
});
afterAll(stopTestDb);

describe("GET /api/products", () => {
  it("search matches name case-insensitively, escapes regex characters, skips inactive products", async () => {
    const res = await list({ search: "ROSE" });
    expect(res.status).toBe(200);
    expect(res.body.products.map((p: any) => p.name).sort()).toEqual(["Rose (Shampoo) 200ml", "rosewater toner"]);
    expect((await list({ search: "(shampoo)" })).body.products).toHaveLength(1);
    expect((await list({ q: "toner" })).body.products).toHaveLength(1);
    expect((await list({ search: ".*" })).body.products).toHaveLength(0);
    expect(productsContract.productListResponse.parse(res.body)).toBeTruthy();
  });

  it("featured=true returns active hero products in hero order, combinable with search", async () => {
    const res = await list({ featured: true });
    expect(res.body.products.map((p: any) => String(p._id))).toEqual([ids[12], ids[3], ids[50]].map(String));
    expect(res.body.pagination).toMatchObject({ total: 3, hasMore: false });
    const paged = await list({ featured: true, limit: 2, page: 2 });
    expect(paged.body.products.map((p: any) => String(p._id))).toEqual([String(ids[50])]);
    expect((await list({ featured: true, search: "Item 3" })).body.products.map((p: any) => String(p._id))).toEqual([String(ids[3])]);
  });

  it("clamps limit to 100 for everyone, up to 1000 for admins", async () => {
    const pub = await list({ limit: 1000 });
    expect(pub.body.products).toHaveLength(100);
    expect(pub.body.pagination).toMatchObject({ limit: 100, total: 130, pages: 2, hasMore: true });

    auth.session = { user: { id: "a", role: "admin" } };
    try {
      const admin = await list({ limit: 1000, page: 1, search: "Item" });
      expect(admin.body.products).toHaveLength(128);
      expect(admin.body.pagination.limit).toBe(1000);
    } finally {
      auth.session = null;
    }
    expect((await list({ limit: "abc" })).body.pagination.limit).toBe(12);
    expect((await list({ limit: -5 })).body.pagination.limit).toBe(1);
  });

  it("paginates newest first without overlap", async () => {
    const p1 = (await list({ limit: 50, page: 1 })).body;
    const p3 = (await list({ limit: 50, page: 3 })).body;
    expect(p1.products[0].name).toBe("Item 129");
    expect(p3.products).toHaveLength(30);
    expect(p3.pagination.hasMore).toBe(false);
    const seen = new Set([...p1.products, ...p3.products].map((p: any) => String(p._id)));
    expect(seen.size).toBe(80);
  });

  it("ids and exclude combine (exclude no longer overrides ids), and ids are part of the cache key", async () => {
    const a = await list({ ids: `${ids[1]},${ids[2]}`, exclude: String(ids[2]) });
    expect(a.body.products.map((p: any) => String(p._id))).toEqual([String(ids[1])]);
    const b = await list({ ids: `${ids[5]}` });
    expect(b.body.products.map((p: any) => String(p._id))).toEqual([String(ids[5])]);
  });
});
