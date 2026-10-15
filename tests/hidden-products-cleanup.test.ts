// Products hidden for an expired subscription (and switched-off or
// unapproved ones) must not be offered anywhere a customer can follow them,
// and they must come back whenever the subscription is active again:
//   - GET /api/hero-products, the homepage "Featured" section
//   - app/sitemap.ts
//   - PATCH /api/admin/vendor-subscriptions/[shopId]: "grant_free" and
//     "extend" bring hidden products and posts back, like a paid renewal.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
// Cancelling a subscription emails the vendor; nothing may leave a test.
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  sendEmail: async () => {},
}));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let heroRoute: typeof import("@/app/api/hero-products/route");
let sitemap: typeof import("@/app/sitemap").default;
let subscriptionRoute: typeof import("@/app/api/admin/vendor-subscriptions/[shopId]/route");
let productModelRegisteredByHeroRoute = false;

const DAY = 24 * 60 * 60 * 1000;
const oid = () => new mongoose.Types.ObjectId();
const admin = { user: { id: String(oid()), email: "admin@example.com", name: "Admin", role: "admin" } };
let seq = 0;

async function addProduct(shopId: mongoose.Types.ObjectId, name: string, over: Record<string, unknown> = {}) {
  const _id = oid();
  await db.collection("products").insertOne({ _id, name, slug: `p-${++seq}`, price: 100, image: "/p.jpg", shopId, isActive: true, approvalStatus: "approved", createdAt: new Date(), updatedAt: new Date(), ...over });
  return _id;
}
const feature = (productId: mongoose.Types.ObjectId, sortOrder: number, isActive = true) =>
  db.collection("heroproducts").insertOne({ productId, sortOrder, isActive, createdAt: new Date(), updatedAt: new Date() });
const featuredNames = async () => ((await call(heroRoute.GET, "/api/hero-products")).body as any[]).map((p) => p.name);

/** A shop whose subscription expired 40 days ago, with hidden products and a hidden post. */
async function makeLapsedShop() {
  const shopId = oid();
  await db.collection("shops").insertOne({ _id: shopId, ownerId: oid(), shopName: `Lapsed ${++seq}`, slug: `lapsed-${seq}`, isApproved: true, isActive: true });
  await db.collection("vendorsubscriptions").insertOne({ shopId, status: "expired", expiryDate: new Date(Date.now() - 40 * DAY), amount: 999, currency: "INR", paymentHistory: [], source: "paid" });
  const hiddenA = await addProduct(shopId, `Hidden A ${seq}`, { hiddenBySubscription: true });
  const hiddenB = await addProduct(shopId, `Hidden B ${seq}`, { hiddenBySubscription: true });
  await db.collection("shopposts").insertOne({ shopId, title: "Hidden post", text: "", images: [], status: "published", hiddenBySubscription: true, createdAt: new Date(), updatedAt: new Date() });
  return { shopId, id: String(shopId), hiddenA, hiddenB };
}
const hiddenCount = async (shopId: mongoose.Types.ObjectId) => ({
  products: await db.collection("products").countDocuments({ shopId, hiddenBySubscription: true }),
  posts: await db.collection("shopposts").countDocuments({ shopId, hiddenBySubscription: true }),
});
const act = (shopId: string, body: unknown) =>
  call(subscriptionRoute.PATCH, `/api/admin/vendor-subscriptions/${shopId}`, { method: "PATCH", body, params: { shopId } });

beforeAll(async () => {
  db = await startTestDb();
  // The hero route must register the Product model itself (nothing else it
  // imports does), so it is imported before anything that would.
  const before = mongoose.modelNames().includes("Product");
  heroRoute = await import("@/app/api/hero-products/route");
  productModelRegisteredByHeroRoute = !before && mongoose.modelNames().includes("Product");
  ({ default: sitemap } = await import("@/app/sitemap"));
  subscriptionRoute = await import("@/app/api/admin/vendor-subscriptions/[shopId]/route");
  await import("@/lib/models/audit-log");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(() => {
  auth.session = null;
});

describe("homepage Featured section and sitemap", () => {
  it("show only products that are switched on, approved and not hidden", async () => {
    expect(productModelRegisteredByHeroRoute).toBe(true);
    const shopId = oid();
    const ids = {
      visible: await addProduct(shopId, "Visible"),
      legacy: await addProduct(shopId, "Saved before approval existed", { approvalStatus: undefined }),
      off: await addProduct(shopId, "Switched off", { isActive: false }),
      pending: await addProduct(shopId, "Waiting for approval", { approvalStatus: "pending" }),
      rejected: await addProduct(shopId, "Rejected", { approvalStatus: "rejected" }),
      hidden: await addProduct(shopId, "Hidden for expired subscription", { hiddenBySubscription: true }),
    };
    await db.collection("products").updateOne({ _id: ids.legacy }, { $unset: { approvalStatus: 1 } });
    // Featured in this order; the deleted product's entry was left behind.
    let order = 0;
    for (const id of [ids.off, ids.visible, ids.pending, ids.hidden, oid(), ids.rejected, ids.legacy]) await feature(id, order++);
    await feature(await addProduct(shopId, "Featured entry switched off"), order++, false);

    expect(await featuredNames()).toEqual(["Visible", "Saved before approval existed"]);
    const featured = (await call(heroRoute.GET, "/api/hero-products")).body[0];
    expect(featured).toEqual({ _id: String(ids.visible), name: "Visible", image: "/p.jpg", price: 100, slug: expect.any(String) });

    const urls = (await sitemap()).map((entry) => entry.url);
    for (const id of [ids.visible, ids.legacy]) expect(urls, String(id)).toContain(`http://localhost:3000/products/${id}`);
    for (const id of [ids.off, ids.pending, ids.rejected, ids.hidden]) expect(urls, String(id)).not.toContain(`http://localhost:3000/products/${id}`);
    // The rest of the sitemap is unchanged.
    expect(urls).toEqual(expect.arrayContaining(["http://localhost:3000", "http://localhost:3000/shop", "http://localhost:3000/blog"]));
  });
});

describe("admin subscription actions bring hidden products and posts back", () => {
  it("grant free access: the shop's hidden products and posts are shown again, and Featured lists them", async () => {
    const lapsed = await makeLapsedShop();
    const other = await makeLapsedShop();
    await feature(lapsed.hiddenA, 1000);
    expect(await featuredNames()).not.toContain(`Hidden A ${seq - 3}`);

    auth.session = admin;
    const res = await act(lapsed.id, { action: "grant_free", unit: "month" });
    expect(res).toMatchObject({ status: 200, body: { success: true, subscription: { status: "active", source: "comped" } } });

    expect(await hiddenCount(lapsed.shopId)).toEqual({ products: 0, posts: 0 });
    // Another lapsed shop is untouched.
    expect(await hiddenCount(other.shopId)).toEqual({ products: 2, posts: 1 });
    const name = (await db.collection("products").findOne({ _id: lapsed.hiddenA }))!.name;
    expect(await featuredNames()).toContain(name);

    const log = await db.collection("auditlogs").findOne({ action: "VENDOR_SUBSCRIPTION_GRANTED_FREE", shopId: lapsed.shopId });
    expect(log?.metadata).toEqual({ unit: "month", productsShown: 2, postsShown: 1 });
  });

  it("extend by days: the same", async () => {
    const lapsed = await makeLapsedShop();
    auth.session = admin;
    const res = await act(lapsed.id, { action: "extend", days: 10 });
    expect(res).toMatchObject({ status: 200, body: { success: true, subscription: { status: "active", source: "paid" } } });
    expect(new Date(res.body.subscription.expiryDate).getTime()).toBeGreaterThan(Date.now() + 9 * DAY);

    expect(await hiddenCount(lapsed.shopId)).toEqual({ products: 0, posts: 0 });
    const log = await db.collection("auditlogs").findOne({ action: "VENDOR_SUBSCRIPTION_EXTENDED", shopId: lapsed.shopId });
    expect(log?.metadata).toEqual({ days: 10, productsShown: 2, postsShown: 1 });
  });

  it("is harmless when nothing is hidden, and a repeat shows nothing twice", async () => {
    const lapsed = await makeLapsedShop();
    auth.session = admin;
    await act(lapsed.id, { action: "extend", days: 10 });
    expect((await act(lapsed.id, { action: "extend", days: 5 })).status).toBe(200);
    const logs = await db.collection("auditlogs").find({ action: "VENDOR_SUBSCRIPTION_EXTENDED", shopId: lapsed.shopId }).sort({ createdAt: 1 }).toArray();
    expect(logs.map((l) => l.metadata)).toEqual([
      { days: 10, productsShown: 2, postsShown: 1 },
      { days: 5, productsShown: 0, postsShown: 0 },
    ]);
  });

  it("cancelling, a bad request or a non-admin brings nothing back", async () => {
    const lapsed = await makeLapsedShop();

    auth.session = { user: { id: String(oid()), email: "v@example.com", name: "V", role: "shop_owner" } };
    expect(await act(lapsed.id, { action: "grant_free", unit: "month" })).toMatchObject({ status: 401 });
    auth.session = null;
    expect(await act(lapsed.id, { action: "extend", days: 10 })).toMatchObject({ status: 401 });

    auth.session = admin;
    expect(await act(lapsed.id, { action: "extend", days: 0 })).toMatchObject({ status: 400 });
    expect(await act(lapsed.id, { action: "grant_free", unit: "week" })).toMatchObject({ status: 400 });
    expect(await act(lapsed.id, { action: "cancel", reason: "Closing down" })).toMatchObject({ status: 200 });

    expect(await hiddenCount(lapsed.shopId)).toEqual({ products: 2, posts: 1 });
  });
});
