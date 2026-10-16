// The /services admin side: service categories, the navbar switch and the
// featured vendors (lib/services-admin.ts, app/api/admin/services/...).
// Every change must be written to AuditLog.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";
import { categoryName, slugifyCategory, STARTING_SERVICE_CATEGORIES } from "@/lib/service-category-rules";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let S: typeof import("@/lib/services-admin");

const DAY = 24 * 60 * 60 * 1000;
const oid = () => new mongoose.Types.ObjectId();
const ADMIN = { id: String(oid()), ip: "203.0.113.7" };
let seq = 0;

async function makeShop(o: { storeType?: string; approved?: boolean; active?: boolean; category?: mongoose.Types.ObjectId | null; expiredDaysAgo?: number } = {}) {
  const _id = oid();
  const n = ++seq;
  await db.collection("shops").insertOne({
    _id, ownerId: oid(), shopName: `Shop ${String(n).padStart(3, "0")}`, slug: `shop-${n}`, isApproved: o.approved ?? true, isActive: o.active ?? true,
    address: { city: "Pune", state: "MH" }, ...(o.storeType ? { storeType: o.storeType } : {}), ...(o.category !== undefined ? { serviceCategory: o.category } : {}),
  });
  if (o.expiredDaysAgo !== undefined) {
    await db.collection("vendorsubscriptions").insertOne({ shopId: _id, status: "expired", expiryDate: new Date(Date.now() - o.expiredDaysAgo * DAY), amount: 999, currency: "INR", paymentHistory: [] });
  }
  return _id;
}
const auditOf = (action: string) => db.collection("auditlogs").find({ action }).toArray();
const categories = () => db.collection("servicecategories").find().sort({ sortOrder: 1 }).toArray();

beforeAll(async () => {
  db = await startTestDb();
  for (const name of ["servicecategories", "platformsettings", "vendorsubscriptions"]) await db.createCollection(name).catch(() => {});
  S = await import("@/lib/services-admin");
  await import("@/lib/models/audit-log");
  await import("@/lib/models/vendor-subscription");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(async () => {
  auth.session = null;
  for (const c of ["servicecategories", "platformsettings", "shops", "auditlogs", "vendorsubscriptions"]) await db.collection(c).deleteMany({});
});

describe("category rules", () => {
  it("falls back to English for a missing translation, and makes URL-safe slugs", () => {
    expect(categoryName({ en: "Repairs", ar: "الإصلاحات", hi: "" }, "ar")).toBe("الإصلاحات");
    expect(categoryName({ en: "Repairs", ar: "الإصلاحات", hi: "  " }, "hi")).toBe("Repairs");
    expect(categoryName({ en: "Repairs" }, "fr")).toBe("Repairs");
    expect(slugifyCategory("Beauty & Wellness")).toBe("beauty-wellness");
    expect(slugifyCategory("  Café Décor! ")).toBe("cafe-decor");
    expect(slugifyCategory("!!!")).toBe("category");
  });

  it("starts with the eight categories asked for, in that order, each in three languages", () => {
    expect(STARTING_SERVICE_CATEGORIES.map((c) => c.en)).toEqual(["Photography", "Design", "Tutoring", "Consulting", "Events", "Beauty & Wellness", "Repairs", "Other"]);
    for (const c of STARTING_SERVICE_CATEGORIES) expect(c.ar && c.hi, c.en).toBeTruthy();
  });
});

describe("starting categories", () => {
  it("are added once to an empty list, in order, and logged", async () => {
    const res = await S.addStartingServiceCategories(ADMIN);
    expect(res.ok).toBe(true);
    const stored = await categories();
    expect(stored.map((c) => [c.name.en, c.slug, c.sortOrder])).toEqual(STARTING_SERVICE_CATEGORIES.map((c, i) => [c.en, slugifyCategory(c.en), i]));
    expect(stored[5].name).toEqual({ en: "Beauty & Wellness", ar: "الجمال والعناية", hi: "सौंदर्य और वेलनेस" });
    expect(await auditOf("SERVICE_CATEGORIES_STARTING_ADDED")).toHaveLength(1);

    expect(await S.addStartingServiceCategories(ADMIN)).toMatchObject({ ok: false, status: 409, reason: "NOT_EMPTY" });
    expect(await categories()).toHaveLength(8);
    expect(await auditOf("SERVICE_CATEGORIES_STARTING_ADDED")).toHaveLength(1);
  });

  it("are refused once any category exists", async () => {
    await S.createServiceCategory({ name: { en: "Catering" } }, ADMIN);
    expect(await S.addStartingServiceCategories(ADMIN)).toMatchObject({ ok: false, reason: "NOT_EMPTY" });
    expect(await categories()).toHaveLength(1);
  });
});

describe("creating, renaming, reordering and removing categories", () => {
  it("creates at the end of the list with a slug from the English name, and logs it", async () => {
    await S.addStartingServiceCategories(ADMIN);
    const res = await S.createServiceCategory({ name: { en: "  Home Cleaning ", ar: "التنظيف", hi: 7 } }, ADMIN);
    expect(res).toMatchObject({ ok: true, category: { name: { en: "Home Cleaning", ar: "التنظيف", hi: "" }, slug: "home-cleaning", sortOrder: 8, vendorCount: 0 } });
    const log = await auditOf("SERVICE_CATEGORY_CREATED");
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ performedBy: ADMIN.id, ipAddress: ADMIN.ip, targetEntity: "ServiceCategory", after: { slug: "home-cleaning" } });
  });

  it("refuses a missing or too long name and a taken English name, whatever its case", async () => {
    await S.createServiceCategory({ name: { en: "Design" } }, ADMIN);
    expect(await S.createServiceCategory({}, ADMIN)).toMatchObject({ ok: false, status: 400, reason: "NAME_REQUIRED", field: "name.en" });
    expect(await S.createServiceCategory({ name: { en: "  ", ar: "تصميم" } }, ADMIN)).toMatchObject({ ok: false, reason: "NAME_REQUIRED" });
    expect(await S.createServiceCategory({ name: { en: "x".repeat(61) } }, ADMIN)).toMatchObject({ ok: false, reason: "NAME_TOO_LONG", field: "name.en" });
    expect(await S.createServiceCategory({ name: { en: "OK", hi: "x".repeat(61) } }, ADMIN)).toMatchObject({ ok: false, reason: "NAME_TOO_LONG", field: "name.hi" });
    expect(await S.createServiceCategory({ name: { en: "design" } }, ADMIN)).toMatchObject({ ok: false, status: 409, reason: "NAME_TAKEN" });
    expect(await categories()).toHaveLength(1);
    // Same slug, different name: the slug gets a number.
    expect(await S.createServiceCategory({ name: { en: "Design!" } }, ADMIN)).toMatchObject({ ok: true, category: { slug: "design-2" } });
  });

  it("renames without changing the slug, and logs only a real change", async () => {
    const { category } = (await S.createServiceCategory({ name: { en: "Tutoring" } }, ADMIN)) as any;
    const res = await S.renameServiceCategory(category._id, { name: { en: "Tutoring & Classes", ar: "الدروس", hi: "ट्यूशन" } }, ADMIN);
    expect(res).toMatchObject({ ok: true, category: { slug: "tutoring", name: { en: "Tutoring & Classes", ar: "الدروس", hi: "ट्यूशन" } } });
    await S.renameServiceCategory(category._id, { name: { en: "Tutoring & Classes", ar: "الدروس", hi: "ट्यूशन" } }, ADMIN);
    const log = await auditOf("SERVICE_CATEGORY_RENAMED");
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ before: { name: { en: "Tutoring" } }, after: { name: { en: "Tutoring & Classes" } } });

    await S.createServiceCategory({ name: { en: "Events" } }, ADMIN);
    expect(await S.renameServiceCategory(category._id, { name: { en: "EVENTS" } }, ADMIN)).toMatchObject({ ok: false, reason: "NAME_TAKEN" });
    expect(await S.renameServiceCategory(String(oid()), { name: { en: "X" } }, ADMIN)).toMatchObject({ ok: false, status: 404 });
    expect(await S.renameServiceCategory("nope", { name: { en: "X" } }, ADMIN)).toMatchObject({ ok: false, status: 404 });
  });

  it("reorders only with every category listed exactly once", async () => {
    await S.addStartingServiceCategories(ADMIN);
    const ids = (await categories()).map((c) => String(c._id));
    const reversed = [...ids].reverse();
    expect(await S.reorderServiceCategories({ order: reversed }, ADMIN)).toEqual({ ok: true, order: reversed });
    expect((await categories()).map((c) => String(c._id))).toEqual(reversed);
    expect(await auditOf("SERVICE_CATEGORIES_REORDERED")).toHaveLength(1);

    for (const order of [reversed.slice(1), [...reversed, reversed[0]], [...reversed.slice(1), String(oid())], "nope"]) {
      expect(await S.reorderServiceCategories({ order }, ADMIN)).toMatchObject({ ok: false, reason: "ORDER" });
    }
    expect((await categories()).map((c) => String(c._id))).toEqual(reversed);
    expect(await auditOf("SERVICE_CATEGORIES_REORDERED")).toHaveLength(1);
  });

  it("removes a category in use: its shops are left without one, and the log says how many", async () => {
    const { category } = (await S.createServiceCategory({ name: { en: "Repairs" } }, ADMIN)) as any;
    const { category: other } = (await S.createServiceCategory({ name: { en: "Other" } }, ADMIN)) as any;
    const id = new mongoose.Types.ObjectId(category._id);
    const a = await makeShop({ storeType: "services", category: id });
    const b = await makeShop({ storeType: "both", category: id });
    const c = await makeShop({ storeType: "services", category: new mongoose.Types.ObjectId(other._id) });

    expect(await S.removeServiceCategory(category._id, ADMIN)).toEqual({ ok: true, vendorsAffected: 2 });
    expect((await categories()).map((x) => x.name.en)).toEqual(["Other"]);
    for (const shop of [a, b]) expect((await db.collection("shops").findOne({ _id: shop }))?.serviceCategory).toBeNull();
    expect(String((await db.collection("shops").findOne({ _id: c }))?.serviceCategory)).toBe(other._id);
    const log = await auditOf("SERVICE_CATEGORY_REMOVED");
    expect(log[0]).toMatchObject({ before: { name: { en: "Repairs" }, slug: "repairs" }, metadata: { vendorsAffected: 2 } });

    expect(await S.removeServiceCategory(category._id, ADMIN)).toMatchObject({ ok: false, status: 404 });
  });
});

describe("navbar switch", () => {
  it("starts off, switches, and logs only a real change", async () => {
    expect(await S.isServicesEnabled()).toBe(false);
    expect(await S.setServicesNavEnabled({ enabled: true }, ADMIN)).toEqual({ ok: true, navEnabled: true });
    expect(await S.isServicesEnabled()).toBe(true);
    await S.setServicesNavEnabled({ enabled: true }, ADMIN);
    await S.setServicesNavEnabled({ enabled: false }, ADMIN);
    const log = await auditOf("SERVICES_NAV_SWITCHED");
    expect(log.map((l) => [l.before.servicesNavEnabled, l.after.servicesNavEnabled])).toEqual([[false, true], [true, false]]);
    expect(await S.setServicesNavEnabled({ enabled: "yes" }, ADMIN)).toMatchObject({ ok: false, reason: "ENABLED" });
    expect(await db.collection("platformsettings").countDocuments()).toBe(1);
  });

  it("keeps the other platform settings", async () => {
    await db.collection("platformsettings").insertOne({ supportEmail: "help@example.com", taxRatePercent: 5 });
    await S.setServicesNavEnabled({ enabled: true }, ADMIN);
    expect(await db.collection("platformsettings").findOne()).toMatchObject({ supportEmail: "help@example.com", taxRatePercent: 5, servicesNavEnabled: true });
  });
});

describe("featured vendors", () => {
  it("accepts approved Services or Both shops in the given order, and logs the change", async () => {
    const a = String(await makeShop({ storeType: "services" }));
    const b = String(await makeShop({ storeType: "both" }));
    expect(await S.setFeaturedShops({ shopIds: [b, a] }, ADMIN)).toEqual({ ok: true, featured: [b, a] });
    expect((await db.collection("platformsettings").findOne())?.servicesFeaturedShops.map(String)).toEqual([b, a]);
    expect(await S.setFeaturedShops({ shopIds: [a, b] }, ADMIN)).toEqual({ ok: true, featured: [a, b] });
    await S.setFeaturedShops({ shopIds: [a, b] }, ADMIN);
    const log = await auditOf("SERVICES_FEATURED_UPDATED");
    expect(log.map((l) => l.after.servicesFeaturedShops)).toEqual([[b, a], [a, b]]);
  });

  it("refuses to add a Products shop, an unapproved or unknown shop, or a repeat", async () => {
    const ok = String(await makeShop({ storeType: "services" }));
    const products = String(await makeShop({ storeType: "products" }));
    const legacy = String(await makeShop());
    const pending = String(await makeShop({ storeType: "services", approved: false }));
    const unknown = String(oid());
    const res = await S.setFeaturedShops({ shopIds: [ok, products, legacy, pending, unknown] }, ADMIN);
    expect(res).toMatchObject({ ok: false, status: 400, reason: "SHOPS" });
    expect((res as any).invalidIds.sort()).toEqual([products, legacy, pending, unknown].sort());
    expect(await S.setFeaturedShops({ shopIds: [ok, ok] }, ADMIN)).toMatchObject({ ok: false, reason: "SHOPS" });
    expect(await S.setFeaturedShops({ shopIds: ["nope"] }, ADMIN)).toMatchObject({ ok: false, reason: "SHOPS" });
    expect(await auditOf("SERVICES_FEATURED_UPDATED")).toEqual([]);
  });

  it("lets a featured shop that stopped qualifying stay, so the list can still be reordered", async () => {
    const a = await makeShop({ storeType: "services" });
    const b = await makeShop({ storeType: "services" });
    await S.setFeaturedShops({ shopIds: [String(a), String(b)] }, ADMIN);
    await db.collection("shops").updateOne({ _id: a }, { $set: { storeType: "products" } });
    expect(await S.setFeaturedShops({ shopIds: [String(b), String(a)] }, ADMIN)).toMatchObject({ ok: true });
    expect(await S.setFeaturedShops({ shopIds: [String(b)] }, ADMIN)).toMatchObject({ ok: true, featured: [String(b)] });
  });
});

describe("overview for the admin page", () => {
  it("lists categories with vendor counts, featured shops with why one is not shown, and the shops that can be featured", async () => {
    await S.addStartingServiceCategories(ADMIN);
    const [photo, design] = await categories();
    const shown = await makeShop({ storeType: "services", category: photo._id });
    const expired = await makeShop({ storeType: "both", category: photo._id, expiredDaysAgo: 40 });
    const graceOnly = await makeShop({ storeType: "services", category: design._id, expiredDaysAgo: 10 });
    const off = await makeShop({ storeType: "services", active: false });
    const turnedProducts = await makeShop({ storeType: "services" });
    await makeShop({ storeType: "products", category: design._id });
    await makeShop({ storeType: "services", approved: false });
    const gone = String(oid());
    await S.setFeaturedShops({ shopIds: [String(shown), String(expired), String(off), String(turnedProducts)] }, ADMIN);
    await db.collection("shops").updateOne({ _id: turnedProducts }, { $set: { storeType: "products" } });
    await db.collection("platformsettings").updateOne({}, { $push: { servicesFeaturedShops: new mongoose.Types.ObjectId(gone) } } as any);
    await S.setServicesNavEnabled({ enabled: true }, ADMIN);

    const o = await S.getServicesOverview();
    expect(o.navEnabled).toBe(true);
    expect(o.categories.map((c) => [c.name.en, c.vendorCount])).toEqual([["Photography", 2], ["Design", 2], ["Tutoring", 0], ["Consulting", 0], ["Events", 0], ["Beauty & Wellness", 0], ["Repairs", 0], ["Other", 0]]);
    expect(o.featured.map((f) => [f._id, f.notShown])).toEqual([
      [String(shown), null], [String(expired), "subscription"], [String(off), "inactive"], [String(turnedProducts), "not_services"], [gone, "missing"],
    ]);
    expect(o.featured[0]).toMatchObject({ city: "Pune", serviceCategory: String(photo._id) });
    // Approved Services/Both shops only; within the 7-day grace a shop is still shown.
    expect(o.vendors.map((v) => [v._id, v.notShown]).sort()).toEqual([
      [String(shown), null], [String(expired), "subscription"], [String(graceOnly), null], [String(off), "inactive"],
    ].sort());
  });
});

describe("admin routes", () => {
  const routes = async () => ({
    overview: await import("@/app/api/admin/services/route"),
    nav: await import("@/app/api/admin/services/nav/route"),
    featured: await import("@/app/api/admin/services/featured/route"),
    categories: await import("@/app/api/admin/services/categories/route"),
    starting: await import("@/app/api/admin/services/categories/starting/route"),
    category: await import("@/app/api/admin/services/categories/[id]/route"),
  });
  const adminSession = { user: { id: ADMIN.id, email: "admin@example.com", name: "Admin", role: "admin" } };

  it("only let an admin in", async () => {
    const r = await routes();
    const id = String(oid());
    const every = () => [
      call(r.overview.GET, "/api/admin/services"),
      call(r.nav.PUT, "/api/admin/services/nav", { method: "PUT", body: { enabled: true } }),
      call(r.featured.PUT, "/api/admin/services/featured", { method: "PUT", body: { shopIds: [] } }),
      call(r.categories.POST, "/api/admin/services/categories", { method: "POST", body: { name: { en: "X" } } }),
      call(r.categories.PUT, "/api/admin/services/categories", { method: "PUT", body: { order: [] } }),
      call(r.starting.POST, "/api/admin/services/categories/starting", { method: "POST" }),
      call(r.category.PUT, `/api/admin/services/categories/${id}`, { method: "PUT", body: { name: { en: "X" } }, params: { id } }),
      call(r.category.DELETE, `/api/admin/services/categories/${id}`, { method: "DELETE", params: { id } }),
    ];
    for (const session of [null, { user: { id: String(oid()), role: "shop_owner" } }, { user: { id: String(oid()), role: "user" } }]) {
      auth.session = session;
      for (const res of await Promise.all(every())) expect(res.status).toBe(401);
    }
    expect(await categories()).toEqual([]);
    expect(await db.collection("platformsettings").countDocuments()).toBe(0);
    expect(await db.collection("auditlogs").countDocuments()).toBe(0);
  });

  it("do each action for an admin, logged with the admin and their address", async () => {
    const r = await routes();
    auth.session = adminSession;
    const shop = String(await makeShop({ storeType: "services" }));

    expect(await call(r.starting.POST, "/api/admin/services/categories/starting", { method: "POST", ip: "198.51.100.4" })).toMatchObject({ status: 201, body: { success: true } });
    const created = await call(r.categories.POST, "/api/admin/services/categories", { method: "POST", body: { name: { en: "Catering" } } });
    expect(created).toMatchObject({ status: 201, body: { category: { slug: "catering", sortOrder: 8 } } });
    const id = created.body.category._id;
    expect(await call(r.category.PUT, `/api/admin/services/categories/${id}`, { method: "PUT", body: { name: { en: "Catering & Food" } }, params: { id } })).toMatchObject({ status: 200, body: { category: { slug: "catering", name: { en: "Catering & Food" } } } });
    const order = (await categories()).map((c) => String(c._id)).reverse();
    expect(await call(r.categories.PUT, "/api/admin/services/categories", { method: "PUT", body: { order } })).toMatchObject({ status: 200, body: { order } });
    expect(await call(r.category.DELETE, `/api/admin/services/categories/${id}`, { method: "DELETE", params: { id } })).toMatchObject({ status: 200, body: { vendorsAffected: 0 } });
    expect(await call(r.nav.PUT, "/api/admin/services/nav", { method: "PUT", body: { enabled: true } })).toMatchObject({ status: 200, body: { navEnabled: true } });
    expect(await call(r.featured.PUT, "/api/admin/services/featured", { method: "PUT", body: { shopIds: [shop] } })).toMatchObject({ status: 200, body: { featured: [shop] } });

    const overview = await call(r.overview.GET, "/api/admin/services");
    expect(overview).toMatchObject({ status: 200, body: { success: true, navEnabled: true, featured: [{ _id: shop, notShown: null }] } });
    expect(overview.body.categories).toHaveLength(8);

    const actions = (await db.collection("auditlogs").find().sort({ createdAt: 1 }).toArray()).map((l) => l.action);
    expect(actions).toEqual([
      "SERVICE_CATEGORIES_STARTING_ADDED", "SERVICE_CATEGORY_CREATED", "SERVICE_CATEGORY_RENAMED", "SERVICE_CATEGORIES_REORDERED",
      "SERVICE_CATEGORY_REMOVED", "SERVICES_NAV_SWITCHED", "SERVICES_FEATURED_UPDATED",
    ]);
    const first = await db.collection("auditlogs").findOne({ action: "SERVICE_CATEGORIES_STARTING_ADDED" });
    expect(first).toMatchObject({ performedBy: ADMIN.id, ipAddress: "198.51.100.4" });
  });

  it("answer a refusal with its reason, and a missing body with 400", async () => {
    const r = await routes();
    auth.session = adminSession;
    expect(await call(r.categories.POST, "/api/admin/services/categories", { method: "POST", body: { name: { en: "" } } })).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR", reason: "NAME_REQUIRED", field: "name.en" } });
    expect(await call(r.featured.PUT, "/api/admin/services/featured", { method: "PUT", body: { shopIds: [String(oid())] } })).toMatchObject({ status: 400, body: { reason: "SHOPS", invalidIds: [expect.any(String)] } });
    expect(await call(r.nav.PUT, "/api/admin/services/nav", { method: "PUT", body: "nope" })).toMatchObject({ status: 400 });
    const id = String(oid());
    expect(await call(r.category.DELETE, `/api/admin/services/categories/${id}`, { method: "DELETE", params: { id } })).toMatchObject({ status: 404, body: { code: "NOT_FOUND" } });
    await call(r.starting.POST, "/api/admin/services/categories/starting", { method: "POST" });
    expect(await call(r.starting.POST, "/api/admin/services/categories/starting", { method: "POST" })).toMatchObject({ status: 409, body: { reason: "NOT_EMPTY" } });
  });
});
