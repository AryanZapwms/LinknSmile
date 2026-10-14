// Store types and posts: how a shop's store type is read and which sections
// its public page shows (lib/shop-store-type.ts), the ShopPost model, and
// what lib/shop-page.ts loads for each kind of shop. In-memory MongoDB.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { shopPageSections, storeTypeOf } from "@/lib/shop-store-type";
import { safeVideoUrl } from "@/lib/shop-post-rules";

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let Shop: typeof import("@/lib/models/shop").default;
let ShopPost: typeof import("@/lib/models/shop-post").ShopPost;
let getShopPageData: typeof import("@/lib/shop-page").getShopPageData;

const MINUTE = 60 * 1000;
let seq = 0;

/** Inserted directly, so a shop can lack storeType the way older shops do. */
async function makeShop(o: Record<string, unknown> = {}) {
  const n = ++seq;
  const shopId = new mongoose.Types.ObjectId();
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: new mongoose.Types.ObjectId(), shopName: `Shop ${n}`, slug: `shop-${n}`, description: "About us", isApproved: true, isActive: true,
    address: { street: "s", city: "Pune", state: "MH", pincode: "411001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    bankDetails: { accountHolderName: "A", accountNumber: "123456789012", ifscCode: "HDFC0001234", bankName: "HDFC" }, panNumber: "ABCDE1234F",
    ...o,
  });
  return { shopId, slug: `shop-${n}` };
}
/** `age` minutes old, so "newest first" is predictable. */
const addProduct = (shopId: mongoose.Types.ObjectId, name: string, age = 0, o: Record<string, unknown> = {}) =>
  db.collection("products").insertOne({ shopId, name, slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${++seq}`, price: 100, image: "https://res.cloudinary.com/test/p.png", stock: 5, isActive: true, approvalStatus: "approved", createdAt: new Date(Date.now() - age * MINUTE), ...o });
const addPost = (shopId: mongoose.Types.ObjectId, title: string, age = 0, o: Record<string, unknown> = {}) =>
  db.collection("shopposts").insertOne({ shopId, title, text: `${title} text`, images: [], status: "published", createdAt: new Date(Date.now() - age * MINUTE), updatedAt: new Date(), ...o });

const names = (items: { name?: string; title?: string }[]) => items.map((i) => i.name ?? i.title);

beforeAll(async () => {
  db = await startTestDb();
  Shop = (await import("@/lib/models/shop")).default;
  ({ ShopPost } = await import("@/lib/models/shop-post"));
  ({ getShopPageData } = await import("@/lib/shop-page"));
  await initModels();
});

afterAll(async () => {
  await stopTestDb();
});

describe("storeTypeOf", () => {
  it("reads a saved store type, and treats a shop without one as a Products shop", () => {
    expect(storeTypeOf({ storeType: "products" })).toBe("products");
    expect(storeTypeOf({ storeType: "services" })).toBe("services");
    expect(storeTypeOf({ storeType: "both" })).toBe("both");
    for (const shop of [{}, { storeType: null }, { storeType: "" }, { storeType: "Services" }, { storeType: 3 }, null, undefined]) {
      expect(storeTypeOf(shop), JSON.stringify(shop)).toBe("products");
    }
  });
});

describe("shopPageSections", () => {
  const sections = (type: "products" | "services" | "both", products: number, posts: number) => shopPageSections(type, { products, posts });

  it("always shows the products section of a Products shop, and never posts", () => {
    expect(sections("products", 4, 0)).toEqual({ products: true, posts: false, nothingYet: false });
    // An empty Products shop keeps the section: it has its own "no products yet" state.
    expect(sections("products", 0, 0)).toEqual({ products: true, posts: false, nothingYet: false });
    expect(sections("products", 4, 3)).toEqual({ products: true, posts: false, nothingYet: false });
  });

  it("shows posts instead of products for a Services shop, even one that has products", () => {
    expect(sections("services", 4, 3)).toEqual({ products: false, posts: true, nothingYet: false });
    expect(sections("services", 0, 3)).toEqual({ products: false, posts: true, nothingYet: false });
    expect(sections("services", 4, 0)).toEqual({ products: false, posts: false, nothingYet: true });
    expect(sections("services", 0, 0)).toEqual({ products: false, posts: false, nothingYet: true });
  });

  it("shows whichever sections of a Both shop have something, and one message when neither does", () => {
    expect(sections("both", 4, 3)).toEqual({ products: true, posts: true, nothingYet: false });
    expect(sections("both", 4, 0)).toEqual({ products: true, posts: false, nothingYet: false });
    expect(sections("both", 0, 3)).toEqual({ products: false, posts: true, nothingYet: false });
    expect(sections("both", 0, 0)).toEqual({ products: false, posts: false, nothingYet: true });
  });
});

describe("safeVideoUrl", () => {
  it("passes an https YouTube or Vimeo link and nothing else", () => {
    expect(safeVideoUrl(" https://www.youtube.com/watch?v=abc ")).toBe("https://www.youtube.com/watch?v=abc");
    for (const value of ["https://example.com/v", "http://example.com/v", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "//example.com/v", "www.youtube.com/watch", "", undefined, null, 5]) {
      expect(safeVideoUrl(value), String(value)).toBeNull();
    }
  });
});

describe("Shop.storeType", () => {
  const base = () => ({ ownerId: new mongoose.Types.ObjectId(), shopName: "S", slug: `model-${++seq}`, address: { street: "s", city: "c", state: "st", pincode: "1" }, contactInfo: { phone: "9", email: "s@e.com" } });

  it("defaults to products and accepts only the three types", () => {
    expect(new Shop(base()).storeType).toBe("products");
    for (const storeType of ["products", "services", "both"]) {
      expect(new Shop({ ...base(), storeType }).validateSync(), storeType).toBeUndefined();
    }
    expect(new Shop({ ...base(), storeType: "wholesale" }).validateSync()?.errors.storeType).toBeDefined();
  });
});

describe("ShopPost model", () => {
  const shopId = new mongoose.Types.ObjectId();
  const invalidFields = (doc: Record<string, unknown>) => Object.keys(new ShopPost(doc).validateSync()?.errors ?? {});

  it("starts as a draft with a created date, and keeps what it is given", async () => {
    const minimal = await ShopPost.create({ shopId, title: "  Grand opening  " });
    expect(minimal).toMatchObject({ title: "Grand opening", text: "", status: "draft" });
    expect(minimal.images).toEqual([]);
    expect(minimal.videoUrl).toBeUndefined();
    expect(minimal.createdAt).toBeInstanceOf(Date);

    const full = await ShopPost.create({ shopId, title: "Workshop", text: "Join us.\nSaturday.", images: ["https://res.cloudinary.com/test/a.png", "https://res.cloudinary.com/test/b.png"], videoUrl: "https://youtu.be/abc", status: "published" });
    const stored = (await db.collection("shopposts").findOne({ _id: full._id }))!;
    expect(stored).toMatchObject({ shopId, title: "Workshop", text: "Join us.\nSaturday.", images: ["https://res.cloudinary.com/test/a.png", "https://res.cloudinary.com/test/b.png"], videoUrl: "https://youtu.be/abc", status: "published" });
    expect(stored.createdAt).toBeInstanceOf(Date);
  });

  it("requires a shop and a title, and enforces the limits", () => {
    expect(invalidFields({ title: "No shop" })).toEqual(["shopId"]);
    expect(invalidFields({ shopId })).toEqual(["title"]);
    expect(invalidFields({ shopId, title: "a".repeat(151) })).toEqual(["title"]);
    expect(invalidFields({ shopId, title: "a".repeat(150), text: "b".repeat(5000), images: Array(10).fill("https://res.cloudinary.com/test/a.png") })).toEqual([]);
    expect(invalidFields({ shopId, title: "T", text: "b".repeat(5001) })).toEqual(["text"]);
    expect(invalidFields({ shopId, title: "T", images: Array(11).fill("https://res.cloudinary.com/test/a.png") })).toEqual(["images"]);
    expect(invalidFields({ shopId, title: "T", status: "archived" })).toEqual(["status"]);
  });

  it("accepts only an https YouTube or Vimeo video link", () => {
    expect(invalidFields({ shopId, title: "T", videoUrl: "https://vimeo.com/123" })).toEqual([]);
    for (const videoUrl of ["https://example.com/v.mp4", "http://vimeo.com/123", "javascript:alert(1)", "vimeo.com/123"]) {
      expect(invalidFields({ shopId, title: "T", videoUrl }), videoUrl).toEqual(["videoUrl"]);
    }
  });
});

describe("getShopPageData", () => {
  it("returns nothing for a shop that is unknown, unapproved or inactive", async () => {
    const pending = await makeShop({ isApproved: false });
    const inactive = await makeShop({ isActive: false });

    expect(await getShopPageData("no-such-shop")).toBeNull();
    expect(await getShopPageData(pending.slug)).toBeNull();
    expect(await getShopPageData(inactive.slug)).toBeNull();
  });

  it("shows a shop saved before store types existed as a Products shop", async () => {
    const shop = await makeShop();
    await addProduct(shop.shopId, "Older soap", 10);
    await addProduct(shop.shopId, "Newer soap", 1);
    await addProduct(shop.shopId, "No approval field", 5, { approvalStatus: undefined });
    await addProduct(shop.shopId, "Pending", 0, { approvalStatus: "pending" });
    await addProduct(shop.shopId, "Switched off", 0, { isActive: false });
    await addPost(shop.shopId, "A post that should not load");

    const data = (await getShopPageData(shop.slug))!;

    expect(data.storeType).toBe("products");
    expect(names(data.products)).toEqual(["Newer soap", "No approval field", "Older soap"]);
    expect(data.posts).toEqual([]);
    expect(data.sections).toEqual({ products: true, posts: false, nothingYet: false });
    expect(data.shop).toMatchObject({ shopName: expect.any(String), description: "About us", address: { city: "Pune" }, contactInfo: { phone: "9" } });
  });

  it("never loads bank details or tax ids for the public page", async () => {
    const shop = await makeShop({ storeType: "both" });

    const data = (await getShopPageData(shop.slug))!;

    expect(data.shop.bankDetails).toBeUndefined();
    expect(data.shop.panNumber).toBeUndefined();
    expect(data.shop.ownerId).toBeUndefined();
  });

  it("shows a Services shop its published posts, newest first, and no products", async () => {
    const shop = await makeShop({ storeType: "services" });
    const other = await makeShop({ storeType: "services" });
    await addProduct(shop.shopId, "A product the page must hide");
    await addPost(shop.shopId, "Older post", 10);
    await addPost(shop.shopId, "Newer post", 1, { images: ["https://res.cloudinary.com/test/a.png"], videoUrl: "https://youtu.be/abc" });
    await addPost(shop.shopId, "A draft", 0, { status: "draft" });
    await addPost(other.shopId, "Another shop's post");

    const data = (await getShopPageData(shop.slug))!;

    expect(data.storeType).toBe("services");
    expect(data.products).toEqual([]);
    expect(names(data.posts)).toEqual(["Newer post", "Older post"]);
    expect(data.posts[0]).toEqual({ _id: expect.any(String), title: "Newer post", text: "Newer post text", images: ["https://res.cloudinary.com/test/a.png"], videoUrl: "https://youtu.be/abc", createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
    expect(data.posts[1].videoUrl).toBeNull();
    expect(data.sections).toEqual({ products: false, posts: true, nothingYet: false });
  });

  it("has nothing to show for a Services shop with only drafts", async () => {
    const shop = await makeShop({ storeType: "services" });
    await addProduct(shop.shopId, "Hidden product");
    await addPost(shop.shopId, "A draft", 0, { status: "draft" });

    const data = (await getShopPageData(shop.slug))!;

    expect(data.posts).toEqual([]);
    expect(data.sections).toEqual({ products: false, posts: false, nothingYet: true });
  });

  it("shows a Both shop whichever of products and posts it has", async () => {
    const full = await makeShop({ storeType: "both" });
    await addProduct(full.shopId, "Soap");
    await addPost(full.shopId, "Workshop");
    const productsOnly = await makeShop({ storeType: "both" });
    await addProduct(productsOnly.shopId, "Candle");
    const postsOnly = await makeShop({ storeType: "both" });
    await addPost(postsOnly.shopId, "Open day");
    const empty = await makeShop({ storeType: "both" });

    const fullData = (await getShopPageData(full.slug))!;
    expect(names(fullData.products)).toEqual(["Soap"]);
    expect(names(fullData.posts)).toEqual(["Workshop"]);
    expect(fullData.sections).toEqual({ products: true, posts: true, nothingYet: false });

    expect((await getShopPageData(productsOnly.slug))!.sections).toEqual({ products: true, posts: false, nothingYet: false });
    expect((await getShopPageData(postsOnly.slug))!.sections).toEqual({ products: false, posts: true, nothingYet: false });
    expect((await getShopPageData(empty.slug))!.sections).toEqual({ products: false, posts: false, nothingYet: true });
  });

  it("drops an unsafe video link, and caps a post's images and the number of posts", async () => {
    const shop = await makeShop({ storeType: "services" });
    for (let i = 0; i < 22; i++) await addPost(shop.shopId, `Post ${String(i).padStart(2, "0")}`, i);
    await addPost(shop.shopId, "Hand-edited post", -1, { videoUrl: "javascript:alert(1)", images: Array.from({ length: 14 }, (_, i) => `https://res.cloudinary.com/test/${i}.png`) });

    const data = (await getShopPageData(shop.slug))!;

    expect(data.posts).toHaveLength(20);
    expect(data.posts[0].title).toBe("Hand-edited post");
    expect(data.posts[0].videoUrl).toBeNull();
    expect(data.posts[0].images).toHaveLength(10);
    expect(data.posts[1].title).toBe("Post 00");
    expect(data.posts.at(-1)!.title).toBe("Post 18");
  });
});
