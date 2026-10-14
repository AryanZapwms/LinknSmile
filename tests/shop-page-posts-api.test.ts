// GET /api/shops/[slug]/posts — the posts grid on the public shop page asks
// it for the next page ("Load more") and for one post opened from a shared
// ?post= link. It must show exactly what the page shows, and nothing else.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let GET: typeof import("@/app/api/shops/[slug]/posts/route").GET;
let getShopPageData: typeof import("@/lib/shop-page").getShopPageData;
let POSTS_PAGE_SIZE: number;

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

async function makeShop(o: { storeType?: string; approved?: boolean; active?: boolean } = {}) {
  const n = ++seq;
  const shopId = oid();
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: oid(), shopName: `Shop ${n}`, slug: `grid-${n}`, isApproved: o.approved ?? true, isActive: o.active ?? true,
    address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    ...(o.storeType ? { storeType: o.storeType } : {}),
  });
  return { shopId, slug: `grid-${n}` };
}

/** A post `age` seconds old (same age = same createdAt). */
async function addPost(shopId: mongoose.Types.ObjectId, title: string, age: number, over: Record<string, unknown> = {}) {
  const _id = oid();
  await db.collection("shopposts").insertOne({
    _id, shopId, title, text: `${title} text`, images: [], status: "published", hiddenBySubscription: false,
    createdAt: new Date(Date.UTC(2026, 9, 1) - age * 1000), updatedAt: new Date(), ...over,
  });
  return String(_id);
}

const page = (slug: string, cursor?: string) =>
  call(GET, `/api/shops/${slug}/posts`, { params: { slug }, query: cursor === undefined ? {} : { cursor } });
const one = (slug: string, post: string) => call(GET, `/api/shops/${slug}/posts`, { params: { slug }, query: { post } });

beforeAll(async () => {
  db = await startTestDb();
  ({ GET } = await import("@/app/api/shops/[slug]/posts/route"));
  ({ getShopPageData, POSTS_PAGE_SIZE } = await import("@/lib/shop-page"));
  await initModels();
});
afterAll(stopTestDb);

describe("GET /api/shops/[slug]/posts", () => {
  it("pages through every shown post once, newest first, even when many share a date", async () => {
    const shop = await makeShop({ storeType: "services" });
    // 30 posts, in groups of five with the same date, so pages split ties.
    const expected: string[] = [];
    for (let i = 0; i < 30; i++) expected.push(await addPost(shop.shopId, `P${i}`, Math.floor(i / 5)));
    // Never shown: a draft, a removed post, a hidden post, another shop's post.
    await addPost(shop.shopId, "Draft", 0, { status: "draft" });
    await addPost(shop.shopId, "Removed", 0, { status: "removed" });
    await addPost(shop.shopId, "Hidden", 0, { hiddenBySubscription: true });
    await addPost((await makeShop({ storeType: "services" })).shopId, "Elsewhere", 0);

    // The page itself renders the first page; the route continues from its cursor.
    const first = (await getShopPageData(shop.slug))!;
    expect(first.posts).toHaveLength(POSTS_PAGE_SIZE);
    const seen = first.posts.map((p) => p._id);
    let cursor = first.nextPostsCursor;
    let requests = 0;
    while (cursor) {
      const res = await page(shop.slug, cursor);
      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBeLessThanOrEqual(POSTS_PAGE_SIZE);
      seen.push(...res.body.posts.map((p: any) => p._id));
      cursor = res.body.nextCursor;
      if (++requests > 5) throw new Error("paging does not end");
    }
    expect(requests).toBe(2);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.sort()).toEqual([...expected].sort());

    // Newest first across pages.
    const all = [first.posts, (await page(shop.slug, first.nextPostsCursor!)).body.posts].flat();
    const dates = all.map((p: any) => Date.parse(p.createdAt));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("without a cursor returns the first page, and refuses a cursor it did not make", async () => {
    const shop = await makeShop({ storeType: "both" });
    await addPost(shop.shopId, "Only one", 0);
    expect(await page(shop.slug)).toMatchObject({ status: 200, body: { posts: [{ title: "Only one", text: "Only one text", images: [], videoUrl: null }], nextCursor: null } });
    for (const bad of ["", "nonsense", "2026-10-01T00:00:00.000Z", "not-a-date_" + String(oid()), `2026-10-01T00:00:00.000Z_${oid()}_x`]) {
      expect(await page(shop.slug, bad), JSON.stringify(bad)).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR" } });
    }
  });

  it("returns one post for a shared link, only if the page would show it", async () => {
    const shop = await makeShop({ storeType: "services" });
    const shown = await addPost(shop.shopId, "Shared", 50, { images: ["https://res.cloudinary.com/test/a.png"], videoUrl: "https://youtu.be/abc" });
    const draft = await addPost(shop.shopId, "Draft", 0, { status: "draft" });
    const removed = await addPost(shop.shopId, "Removed", 0, { status: "removed" });
    const hidden = await addPost(shop.shopId, "Hidden", 0, { hiddenBySubscription: true });
    const elsewhere = await addPost((await makeShop({ storeType: "services" })).shopId, "Elsewhere", 0);

    expect(await one(shop.slug, shown)).toMatchObject({ status: 200, body: { post: { _id: shown, title: "Shared", images: ["https://res.cloudinary.com/test/a.png"], videoUrl: "https://youtu.be/abc" } } });
    for (const id of [draft, removed, hidden, elsewhere, String(oid()), "not-an-id"]) {
      expect(await one(shop.slug, id), id).toMatchObject({ status: 404, body: { code: "NOT_FOUND" } });
    }
  });

  it("404s for a shop whose page is not public or does not show posts", async () => {
    const products = await makeShop({ storeType: "products" });
    const legacy = await makeShop(); // saved before store types: a Products shop
    const pending = await makeShop({ storeType: "services", approved: false });
    const inactive = await makeShop({ storeType: "services", active: false });
    for (const shop of [products, legacy, pending, inactive]) {
      const id = await addPost(shop.shopId, "Post", 0);
      expect(await page(shop.slug), shop.slug).toMatchObject({ status: 404 });
      expect(await one(shop.slug, id), shop.slug).toMatchObject({ status: 404 });
    }
    expect(await page("no-such-shop")).toMatchObject({ status: 404 });
  });
});
