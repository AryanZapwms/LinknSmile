// The public /services page (lib/services-page.ts, app/api/services/vendors)
// and the navbar switch as the browser sees it (/api/platform-settings/public).

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let P: typeof import("@/lib/services-page");
let vendorsRoute: typeof import("@/app/api/services/vendors/route");
let publicSettingsRoute: typeof import("@/app/api/platform-settings/public/route");

const DAY = 24 * 60 * 60 * 1000;
const oid = () => new mongoose.Types.ObjectId();
const adminSession = { user: { id: String(oid()), role: "admin" } };
let seq = 0;

async function makeShop(name: string, o: { storeType?: string | null; approved?: boolean; active?: boolean; category?: mongoose.Types.ObjectId; expiredDaysAgo?: number; logo?: string } = {}) {
  const _id = oid();
  const storeType = o.storeType === undefined ? "services" : o.storeType;
  await db.collection("shops").insertOne({
    _id, ownerId: oid(), shopName: name, slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${++seq}`, isApproved: o.approved ?? true, isActive: o.active ?? true,
    address: { city: "Pune", state: "MH" }, ...(storeType ? { storeType } : {}), ...(o.category ? { serviceCategory: o.category } : {}), ...(o.logo ? { logo: o.logo } : {}),
  });
  if (o.expiredDaysAgo !== undefined) {
    await db.collection("vendorsubscriptions").insertOne({ shopId: _id, status: "expired", expiryDate: new Date(Date.now() - o.expiredDaysAgo * DAY), amount: 999, currency: "INR", paymentHistory: [] });
  }
  return _id;
}
/** A post `minutesAgo` old. */
async function addPost(shopId: mongoose.Types.ObjectId, title: string, minutesAgo: number, over: Record<string, unknown> = {}) {
  const _id = oid();
  await db.collection("shopposts").insertOne({ _id, shopId, title, text: "", images: [`https://res.cloudinary.com/test/${title}.png`], status: "published", hiddenBySubscription: false, createdAt: new Date(Date.now() - minutesAgo * 60_000), updatedAt: new Date(), ...over });
  return String(_id);
}
async function makeCategory(en: string, sortOrder: number, ar = "") {
  const _id = oid();
  await db.collection("servicecategories").insertOne({ _id, name: { en, ar, hi: "" }, slug: en.toLowerCase(), sortOrder, createdAt: new Date(), updatedAt: new Date() });
  return _id;
}
const setSettings = (set: Record<string, unknown>) => db.collection("platformsettings").updateOne({}, { $set: set }, { upsert: true });
const names = (cards: { shopName: string }[]) => cards.map((c) => c.shopName);

beforeAll(async () => {
  db = await startTestDb();
  for (const name of ["servicecategories", "platformsettings", "vendorsubscriptions", "shopposts"]) await db.createCollection(name).catch(() => {});
  P = await import("@/lib/services-page");
  vendorsRoute = await import("@/app/api/services/vendors/route");
  publicSettingsRoute = await import("@/app/api/platform-settings/public/route");
  await import("@/lib/models/vendor-subscription");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(async () => {
  auth.session = null;
  for (const c of ["servicecategories", "platformsettings", "shops", "shopposts", "vendorsubscriptions"]) await db.collection(c).deleteMany({});
});

describe("who is listed", () => {
  it("approved, active Services and Both shops, unless the subscription expired over 30 days ago", async () => {
    await makeShop("Services shop");
    await makeShop("Both shop", { storeType: "both" });
    await makeShop("In grace period", { expiredDaysAgo: 10 });
    await makeShop("No subscription record");
    await makeShop("Products shop", { storeType: "products" });
    await makeShop("Saved before store types", { storeType: null });
    await makeShop("Not approved", { approved: false });
    await makeShop("Switched off", { active: false });
    await makeShop("Expired 40 days", { expiredDaysAgo: 40 });

    const data = await P.getServicesPageData({ locale: "en" });
    expect(names(data.vendors).sort()).toEqual(["Both shop", "In grace period", "No subscription record", "Services shop"]);
    expect(data.featured).toEqual([]);
  });
});

describe("featured and the general list", () => {
  it("featured first in the admin's order, the rest by newest post and then name", async () => {
    const a = await makeShop("Alpha");
    const b = await makeShop("Bravo");
    const c = await makeShop("Charlie");
    const d = await makeShop("Delta");
    const e = await makeShop("Echo");
    const lapsed = await makeShop("Lapsed featured", { expiredDaysAgo: 40 });
    await addPost(b, "b-old", 300);
    await addPost(c, "c-new", 5);
    await addPost(d, "d-mid", 60);
    await addPost(e, "e-draft", 1, { status: "draft" });
    await setSettings({ servicesFeaturedShops: [e, lapsed, a] });

    const data = await P.getServicesPageData({ locale: "en" });
    expect(names(data.featured)).toEqual(["Echo", "Alpha"]);
    // Newest post first; Echo's only post is a draft, but Echo is featured anyway.
    expect(names(data.vendors)).toEqual(["Charlie", "Delta", "Bravo"]);
    expect(data.nextPage).toBeNull();
  });

  it("cards show the city, the category in the reader's language, and the newest picture", async () => {
    const photo = await makeCategory("Photography", 0, "التصوير");
    const repairs = await makeCategory("Repairs", 1);
    const shop = await makeShop("Lens Studio", { category: photo, logo: "https://res.cloudinary.com/test/logo.png" });
    await makeShop("Fixers", { category: repairs });
    await addPost(shop, "older", 50);
    await addPost(shop, "newest-with-picture", 20);
    await addPost(shop, "newer-without-picture", 10, { images: [] });
    await addPost(shop, "hidden", 5, { hiddenBySubscription: true });
    await addPost(shop, "removed", 4, { status: "removed" });

    const ar = await P.getServicesPageData({ locale: "ar" });
    const card = ar.vendors.find((v) => v.shopName === "Lens Studio")!;
    expect(card).toMatchObject({ city: "Pune", logo: "https://res.cloudinary.com/test/logo.png", category: { slug: "photography", name: "التصوير" }, picture: "https://res.cloudinary.com/test/newest-with-picture.png" });
    // No Arabic name: English. No posts: no picture.
    expect(ar.vendors.find((v) => v.shopName === "Fixers")).toMatchObject({ category: { name: "Repairs" }, picture: null });
    expect(ar.categories.map((c) => c.name)).toEqual(["التصوير", "Repairs"]);
  });

  it("shows 24 vendors, and the next page continues where it stopped", async () => {
    for (let i = 0; i < 30; i++) await makeShop(`Vendor ${String(i).padStart(2, "0")}`);
    const first = await P.getServicesPageData({ locale: "en" });
    expect(first.vendors).toHaveLength(24);
    expect(first.nextPage).toBe(2);
    const second = await P.getServicesVendorsPage({ page: 2, locale: "en" });
    expect(second.nextPage).toBeNull();
    expect([...names(first.vendors), ...names(second.vendors)]).toEqual(Array.from({ length: 30 }, (_, i) => `Vendor ${String(i).padStart(2, "0")}`));
  });
});

describe("category filter", () => {
  it("applies to featured, the list and latest work; an unknown category shows all", async () => {
    const photo = await makeCategory("Photography", 0);
    const design = await makeCategory("Design", 1);
    const p1 = await makeShop("Photo One", { category: photo });
    const p2 = await makeShop("Photo Two", { category: photo });
    const d1 = await makeShop("Design One", { category: design });
    await makeShop("No category");
    await addPost(p2, "p2-work", 5);
    await addPost(d1, "d1-work", 1);
    await setSettings({ servicesFeaturedShops: [d1, p1] });

    const filtered = await P.getServicesPageData({ categorySlug: "photography", locale: "en" });
    expect(filtered.activeCategory).toMatchObject({ slug: "photography", name: "Photography" });
    expect(names(filtered.featured)).toEqual(["Photo One"]);
    expect(names(filtered.vendors)).toEqual(["Photo Two"]);
    expect(filtered.latestWork.map((w) => w.title)).toEqual(["p2-work"]);

    const unknown = await P.getServicesPageData({ categorySlug: "nope", locale: "en" });
    expect(unknown.activeCategory).toBeNull();
    expect([...names(unknown.featured), ...names(unknown.vendors)].sort()).toEqual(["Design One", "No category", "Photo One", "Photo Two"]);
  });
});

describe("latest work", () => {
  it("the 8 newest posts with a picture, at most 2 per vendor, each linking to its shop", async () => {
    const busy = await makeShop("Busy");
    const quiet = await makeShop("Quiet");
    const lapsed = await makeShop("Lapsed", { expiredDaysAgo: 40 });
    for (let i = 0; i < 10; i++) await addPost(busy, `busy-${i}`, i);
    await addPost(quiet, "quiet-1", 100);
    await addPost(quiet, "quiet-no-picture", 2, { images: [] });
    await addPost(quiet, "quiet-hidden", 3, { hiddenBySubscription: true });
    await addPost(lapsed, "lapsed-1", 0);
    for (let v = 0; v < 6; v++) {
      const shop = await makeShop(`Other ${v}`);
      await addPost(shop, `other-${v}-a`, 200 + v);
      await addPost(shop, `other-${v}-b`, 300 + v);
      await addPost(shop, `other-${v}-c`, 400 + v);
    }

    const { latestWork } = await P.getServicesPageData({ locale: "en" });
    expect(latestWork.map((w) => w.title)).toEqual(["busy-0", "busy-1", "quiet-1", "other-0-a", "other-1-a", "other-2-a", "other-3-a", "other-4-a"]);
    expect(latestWork[0]).toMatchObject({ shopName: "Busy", picture: "https://res.cloudinary.com/test/busy-0.png", shopSlug: expect.stringMatching(/^busy-/) });
  });
});

describe("the switch", () => {
  it("off: hidden from visitors, a preview for admins; on: shown to everyone", async () => {
    expect(await P.servicesPageAccess()).toEqual({ visible: false, preview: false });
    auth.session = { user: { id: String(oid()), role: "shop_owner" } };
    expect(await P.servicesPageAccess()).toEqual({ visible: false, preview: false });
    auth.session = adminSession;
    expect(await P.servicesPageAccess()).toEqual({ visible: true, preview: true });
    await setSettings({ servicesNavEnabled: true });
    auth.session = null;
    expect(await P.servicesPageAccess()).toEqual({ visible: true, preview: false });
  });

  it("the public settings tell the navbar whether to show the link", async () => {
    expect((await call(publicSettingsRoute.GET, "/api/platform-settings/public")).body.servicesNavEnabled).toBe(false);
    await setSettings({ servicesNavEnabled: true, supportEmail: "help@example.com" });
    expect((await call(publicSettingsRoute.GET, "/api/platform-settings/public")).body).toMatchObject({ servicesNavEnabled: true, supportEmail: "help@example.com" });
  });

  it("Load more answers only while the page is visible", async () => {
    for (let i = 0; i < 26; i++) await makeShop(`Vendor ${String(i).padStart(2, "0")}`);
    expect(await call(vendorsRoute.GET, "/api/services/vendors", { query: { page: 2 } })).toMatchObject({ status: 404 });

    auth.session = adminSession;
    const preview = await call(vendorsRoute.GET, "/api/services/vendors", { query: { page: 2 } });
    expect(preview).toMatchObject({ status: 200, body: { nextPage: null } });
    expect(names(preview.body.vendors)).toEqual(["Vendor 24", "Vendor 25"]);

    auth.session = null;
    await setSettings({ servicesNavEnabled: true });
    expect(await call(vendorsRoute.GET, "/api/services/vendors", { query: { page: 2 } })).toMatchObject({ status: 200 });
    for (const page of ["0", "-1", "1.5", "abc"]) {
      expect(await call(vendorsRoute.GET, "/api/services/vendors", { query: { page } }), page).toMatchObject({ status: 400 });
    }
  });
});
