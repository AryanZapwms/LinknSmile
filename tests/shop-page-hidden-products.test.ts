// The public shop page (lib/shop-page.ts) leaves out products the
// subscription sweep hid (hiddenBySubscription), like the catalogue, the
// product page, the cart and checkout already do.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let getShopPageData: typeof import("@/lib/shop-page").getShopPageData;

let seq = 0;
async function makeShop(storeType?: string) {
  const n = ++seq;
  const shopId = new mongoose.Types.ObjectId();
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: new mongoose.Types.ObjectId(), shopName: `Shop ${n}`, slug: `hidden-${n}`, isApproved: true, isActive: true,
    address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    ...(storeType ? { storeType } : {}),
  });
  return { shopId, slug: `hidden-${n}` };
}
const addProduct = (shopId: mongoose.Types.ObjectId, name: string, over: Record<string, unknown> = {}) =>
  db.collection("products").insertOne({ name, slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${++seq}`, price: 100, shopId, isActive: true, approvalStatus: "approved", createdAt: new Date(), ...over });

beforeAll(async () => {
  db = await startTestDb();
  ({ getShopPageData } = await import("@/lib/shop-page"));
  await initModels();
});
afterAll(stopTestDb);

describe("getShopPageData and hidden products", () => {
  it("leaves out products hidden for an expired subscription and keeps the rest", async () => {
    const shop = await makeShop();
    await addProduct(shop.shopId, "Visible");
    await addProduct(shop.shopId, "Hidden", { hiddenBySubscription: true });
    await addProduct(shop.shopId, "Explicitly not hidden", { hiddenBySubscription: false });

    const data = await getShopPageData(shop.slug);
    expect(data?.products.map((p: any) => p.name).sort()).toEqual(["Explicitly not hidden", "Visible"]);
    expect(data?.sections.products).toBe(true);
  });

  it("a Both shop whose products are all hidden shows the one 'nothing yet' message", async () => {
    const shop = await makeShop("both");
    await addProduct(shop.shopId, "Hidden one", { hiddenBySubscription: true });
    await addProduct(shop.shopId, "Hidden two", { hiddenBySubscription: true });

    const data = await getShopPageData(shop.slug);
    expect(data?.products).toEqual([]);
    expect(data?.sections).toMatchObject({ products: false, nothingYet: true });
  });

  it("shows the products again once renewal clears the flag", async () => {
    const shop = await makeShop();
    await addProduct(shop.shopId, "Back", { hiddenBySubscription: true });
    expect((await getShopPageData(shop.slug))?.products).toEqual([]);

    await db.collection("products").updateMany({ shopId: shop.shopId }, { $set: { hiddenBySubscription: false } });
    expect((await getShopPageData(shop.slug))?.products.map((p: any) => p.name)).toEqual(["Back"]);
  });
});
