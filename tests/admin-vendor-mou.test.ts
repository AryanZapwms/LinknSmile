// Admin MOU tracking: GET /api/admin/vendors/mou (who has accepted the
// current MOU version) and POST /api/admin/vendors/mou/remind (reminder
// emails), against an in-memory MongoDB with nodemailer stubbed out.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
const mail = vi.hoisted(() => ({
  sent: [] as { to: string; subject: string; html: string }[],
  startedAt: [] as number[],
  inFlight: 0,
  maxInFlight: 0,
  failAll: false,
  failFor: new Set<string>(),
  onSend: null as null | ((m: { to: string }) => Promise<void>),
}));
vi.mock("nodemailer", () => {
  const sendMail = async (m: any) => {
    mail.startedAt.push(Date.now());
    mail.maxInFlight = Math.max(mail.maxInFlight, ++mail.inFlight);
    try {
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (mail.failAll || mail.failFor.has(m.to)) throw new Error("smtp unavailable");
      await mail.onSend?.(m);
      mail.sent.push(m);
      return { messageId: "t" };
    } finally {
      mail.inFlight--;
    }
  };
  const t = { createTransport: () => ({ sendMail }) };
  return { default: t, ...t };
});

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let listRoute: typeof import("@/app/api/admin/vendors/mou/route");
let remindRoute: typeof import("@/app/api/admin/vendors/mou/remind/route");
let tracking: typeof import("@/lib/vendor-mou-tracking");
let CURRENT_MOU_VERSION: string;

const HOUR = 60 * 60 * 1000;
const ADMIN_ID = String(new mongoose.Types.ObjectId());
const admin = { user: { id: ADMIN_ID, email: "admin@example.com", name: "Admin", role: "admin", shopId: null } };
let seq = 0;

interface VendorOpts {
  /** true = the current version; a string = that (older) version. */
  accepted?: boolean | string;
  shopActive?: boolean;
  shopName?: string;
  owner?: Record<string, unknown>;
}
async function makeVendor(o: VendorOpts = {}) {
  const n = ++seq;
  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  const owner = { email: `vendor${n}@example.com`, name: `Vendor ${n}`, role: "shop_owner", isActive: true, isVerified: true, password: "hash", ...o.owner };
  await db.collection("users").insertOne({ _id: userId, shopId, ...owner });
  await db.collection("shops").insertOne({
    _id: shopId, ownerId: userId, shopName: o.shopName ?? `Shop ${n}`, slug: `shop-${n}`, isApproved: true, isActive: o.shopActive ?? true,
    address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    // Later vendors are newer shops, so list order is predictable.
    createdAt: new Date(Date.now() - HOUR + n * 1000),
  });
  if (o.accepted) await accept(userId, shopId, o.accepted === true ? CURRENT_MOU_VERSION : o.accepted);
  return { userId, shopId, id: String(shopId), email: owner.email as string };
}
const accept = (userId: mongoose.Types.ObjectId, shopId: mongoose.Types.ObjectId, mouVersion = CURRENT_MOU_VERSION) =>
  db.collection("vendormouacceptances").insertOne({ userId, shopId, mouVersion, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
/** A reminder that went out `hoursAgo`, as sendMouReminders records it. */
const reminded = (shopId: mongoose.Types.ObjectId, hoursAgo: number, mouVersion = CURRENT_MOU_VERSION) =>
  db.collection("auditlogs").insertOne({ action: "VENDOR_MOU_REMINDER_SENT", performedBy: ADMIN_ID, targetEntity: "Shop", targetId: shopId, shopId, metadata: { mouVersion }, createdAt: new Date(Date.now() - hoursAgo * HOUR) });
const reminderRows = (shopId?: mongoose.Types.ObjectId) =>
  db.collection("auditlogs").find({ action: "VENDOR_MOU_REMINDER_SENT", ...(shopId ? { shopId } : {}) }).toArray();

const list = (query: Record<string, string | number> = {}) => call(listRoute.GET, "/api/admin/vendors/mou", { query });
const remind = (body: unknown) => call(remindRoute.POST, "/api/admin/vendors/mou/remind", { body });
const byShop = (results: any[]) => Object.fromEntries(results.map((r) => [r.shopId, r]));

beforeAll(async () => {
  // A deployment has English plus at most one secondary language, read when
  // lib/i18n-config.ts loads. The routes below run as the Arabic deployment.
  process.env.NEXT_PUBLIC_SECONDARY_LOCALE = "ar";
  db = await startTestDb();
  ({ CURRENT_MOU_VERSION } = await import("@/lib/mou-content"));
  listRoute = await import("@/app/api/admin/vendors/mou/route");
  remindRoute = await import("@/app/api/admin/vendors/mou/remind/route");
  tracking = await import("@/lib/vendor-mou-tracking");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(async () => {
  auth.session = admin;
  Object.assign(mail, { sent: [], startedAt: [], inFlight: 0, maxInFlight: 0, failAll: false, onSend: null });
  mail.failFor.clear();
  for (const name of ["users", "shops", "vendormouacceptances", "auditlogs"]) await db.collection(name).deleteMany({});
});

describe("GET /api/admin/vendors/mou", () => {
  it("401 without an admin session", async () => {
    auth.session = null;
    expect((await list()).status).toBe(401);
    auth.session = { user: { ...admin.user, role: "shop_owner" } };
    expect((await list()).status).toBe(401);
  });

  it("counts acceptance of the current version only, over active vendors only, pending first", async () => {
    const accepted = await makeVendor({ accepted: true });
    const pending = await makeVendor();
    const oldVersion = await makeVendor({ accepted: "0.0.1" });
    await makeVendor({ shopActive: false }); // closed, rejected or deactivated shop
    await makeVendor({ owner: { isActive: false, deletedAt: new Date() } }); // deleted account

    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, mouVersion: CURRENT_MOU_VERSION, cooldownHours: 24, summary: { total: 3, accepted: 1, pending: 2 } });
    expect(res.body.vendors.map((v: any) => v.shopId)).toEqual([oldVersion.id, pending.id, accepted.id]);
    expect(res.body.vendors[2]).toMatchObject({ accepted: true, acceptedAt: expect.any(String), canRemind: false });
    expect(res.body.vendors[0]).toMatchObject({ accepted: false, acceptedAt: null, reminderCount: 0, lastRemindedAt: null, canRemind: true });
    // Only the owner's name and email leave the server.
    expect(Object.keys(res.body.vendors[0].owner).sort()).toEqual(["email", "name"]);
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it("status filter, search and pagination narrow the list but not the summary", async () => {
    await makeVendor({ shopName: "Alpha Looms" });
    const beta = await makeVendor({ shopName: "Beta Crafts" });
    await makeVendor({ shopName: "Gamma Spices" });
    const delta = await makeVendor({ shopName: "Delta Teas", accepted: true, owner: { name: "Ravi Kumar", email: "ravi@delta.example" } });
    const ids = async (query: Record<string, string | number>) => (await list(query)).body.vendors.map((v: any) => v.shopId);

    const acceptedOnly = await list({ status: "accepted" });
    expect(acceptedOnly.body.vendors.map((v: any) => v.shopId)).toEqual([delta.id]);
    expect(acceptedOnly.body.summary).toEqual({ total: 4, accepted: 1, pending: 3 });

    expect(await ids({ search: "beta" })).toEqual([beta.id]);
    expect(await ids({ search: "RAVI" })).toEqual([delta.id]);
    expect(await ids({ search: "delta.example" })).toEqual([delta.id]);
    expect(await ids({ search: "beta", status: "accepted" })).toEqual([]);
    expect(await list({ search: "(" })).toMatchObject({ status: 200, body: { vendors: [] } }); // not treated as a regex

    const page1 = await list({ status: "pending", limit: 2 });
    const page2 = await list({ status: "pending", limit: 2, page: 2 });
    expect(page1.body.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(page1.body.vendors).toHaveLength(2);
    expect(page2.body.vendors).toHaveLength(1);
    expect(new Set([...page1.body.vendors, ...page2.body.vendors].map((v: any) => v.shopId)).size).toBe(3);
    expect((await list({ page: "abc", limit: 1000 })).body.pagination).toMatchObject({ page: 1, limit: 100 });
  });

  it("last reminded, reminder count and the cooldown come from this version's AuditLog rows", async () => {
    const recent = await makeVendor();
    await reminded(recent.shopId, 30);
    await reminded(recent.shopId, 2);
    await reminded(recent.shopId, 1, "0.0.1"); // a reminder for an older MOU version
    const longAgo = await makeVendor();
    await reminded(longAgo.shopId, 30);

    const rows = byShop((await list()).body.vendors.map((v: any) => ({ ...v, shopId: v.shopId })));
    expect(rows[recent.id]).toMatchObject({ reminderCount: 2, canRemind: false });
    expect(Date.now() - new Date(rows[recent.id].lastRemindedAt).getTime()).toBeLessThan(2.1 * HOUR);
    expect(new Date(rows[recent.id].nextReminderAt).getTime() - Date.now()).toBeGreaterThan(21.9 * HOUR);
    expect(rows[longAgo.id]).toMatchObject({ reminderCount: 1, nextReminderAt: null, canRemind: true });
  });
});

describe("POST /api/admin/vendors/mou/remind", () => {
  it("401 without an admin session, 400 for a malformed body, and nothing is sent", async () => {
    const v = await makeVendor();
    auth.session = null;
    expect((await remind({ shopIds: [v.id] })).status).toBe(401);
    auth.session = { user: { ...admin.user, role: "shop_owner" } };
    expect((await remind({ all: true })).status).toBe(401);
    auth.session = admin;
    for (const body of [{}, { shopIds: [] }, { shopIds: ["not-an-id"] }, { shopIds: v.id }, { all: true, shopIds: [v.id] }, { all: "yes" }, "not json", { shopIds: Array.from({ length: 101 }, () => String(new mongoose.Types.ObjectId())) }]) {
      expect((await remind(body)).status).toBe(400);
    }
    expect(mail.sent).toHaveLength(0);
    expect(await reminderRows()).toHaveLength(0);
  });

  it("emails a pending vendor in their language, logs it, then holds the 24h cooldown", async () => {
    const v = await makeVendor({ shopName: "A&B Store", owner: { name: "Tom <b>", locale: "ar" } });

    const first = await remind({ shopIds: [v.id] });
    expect(first).toMatchObject({ status: 200, body: { success: true, mouVersion: CURRENT_MOU_VERSION, stopped: null, summary: { sent: 1, failed: 0, skipped: 0, remaining: 0 } } });
    expect(first.body.results).toEqual([{ shopId: v.id, shopName: "A&B Store", email: v.email, status: "sent" }]);

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe(v.email);
    expect(mail.sent[0].subject).toContain("A&B Store");
    const html = mail.sent[0].html;
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("/vendor/mou");
    expect(html).toContain(CURRENT_MOU_VERSION);
    expect(html).toContain("A&amp;B Store");
    expect(html).toContain("Tom &lt;b&gt;");

    const rows = await reminderRows(v.shopId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ performedBy: ADMIN_ID, targetEntity: "Shop", metadata: { mouVersion: CURRENT_MOU_VERSION } });
    expect(JSON.stringify(rows[0])).not.toContain(v.email);
    expect((await list()).body.vendors[0]).toMatchObject({ shopId: v.id, reminderCount: 1, canRemind: false });

    const second = await remind({ shopIds: [v.id] });
    expect(second.body.results).toEqual([{ shopId: v.id, shopName: "A&B Store", email: v.email, status: "skipped", reason: "cooldown" }]);
    expect(mail.sent).toHaveLength(1);
    expect(await reminderRows(v.shopId)).toHaveLength(1);

    // Once the last reminder is more than 24h old, the next one goes out.
    const due = await makeVendor();
    await reminded(due.shopId, 25);
    expect((await remind({ shopIds: [due.id] })).body.results[0]).toMatchObject({ status: "sent" });
    expect(await reminderRows(due.shopId)).toHaveLength(2);
  });

  it("skips accepted, unknown, inactive and email-less shops; a failed send is reported and not logged", async () => {
    const accepted = await makeVendor({ accepted: true });
    const closed = await makeVendor({ shopActive: false });
    const noEmail = await makeVendor({ owner: { email: "" } });
    const failing = await makeVendor();
    const unknown = String(new mongoose.Types.ObjectId());
    mail.failFor.add(failing.email);

    const res = await remind({ shopIds: [accepted.id, closed.id, noEmail.id, failing.id, unknown, failing.id] });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(5);
    const r = byShop(res.body.results);
    expect(r[accepted.id]).toMatchObject({ status: "skipped", reason: "already_accepted" });
    expect(r[closed.id]).toMatchObject({ status: "skipped", reason: "not_found", shopName: null });
    expect(r[unknown]).toMatchObject({ status: "skipped", reason: "not_found" });
    expect(r[noEmail.id]).toMatchObject({ status: "skipped", reason: "no_email" });
    expect(r[failing.id]).toEqual({ shopId: failing.id, shopName: expect.any(String), email: failing.email, status: "failed" });
    expect(res.body.summary).toEqual({ sent: 0, failed: 1, skipped: 4, remaining: 0 });
    expect(mail.sent).toHaveLength(0);
    expect(await reminderRows()).toHaveLength(0);

    // The failed attempt did not start a cooldown.
    mail.failFor.clear();
    expect((await remind({ shopIds: [failing.id] })).body.results[0]).toMatchObject({ status: "sent" });
  });

  it("{ all: true } emails every pending vendor that is not in cooldown, and nobody else", async () => {
    await makeVendor({ accepted: true });
    const justReminded = await makeVendor();
    await reminded(justReminded.shopId, 2);
    const due = await makeVendor();
    await makeVendor({ shopActive: false });

    const res = await remind({ all: true });
    expect(res.body.summary).toEqual({ sent: 1, failed: 0, skipped: 1, remaining: 0 });
    expect(byShop(res.body.results)).toMatchObject({ [due.id]: { status: "sent" }, [justReminded.id]: { status: "skipped", reason: "cooldown" } });
    expect(res.body.results).toHaveLength(2);
    expect(mail.sent.map((m) => m.to)).toEqual([due.email]);
  });
});

describe("sendMouReminders", () => {
  const run = (opts: { sendDelayMs?: number; runBudgetMs?: number } = {}) =>
    tracking.sendMouReminders({ all: true }, { performedBy: ADMIN_ID, sendDelayMs: 0, ...opts });

  it("sends one at a time with a pause in between", async () => {
    for (let i = 0; i < 3; i++) await makeVendor();
    const res = await run({ sendDelayMs: 60 });
    expect(res.summary).toEqual({ sent: 3, failed: 0, skipped: 0, remaining: 0 });
    expect(mail.maxInFlight).toBe(1);
    expect(mail.startedAt[1] - mail.startedAt[0]).toBeGreaterThanOrEqual(50);
    expect(mail.startedAt[2] - mail.startedAt[1]).toBeGreaterThanOrEqual(50);
  });

  it("checks again right before each send, so a vendor who accepts mid-run is not emailed", async () => {
    const first = await makeVendor();
    const second = await makeVendor();
    mail.onSend = async (m) => {
      if (m.to === first.email) await accept(second.userId, second.shopId);
    };
    const res = await run();
    expect(byShop(res.results)).toMatchObject({ [first.id]: { status: "sent" }, [second.id]: { status: "skipped", reason: "already_accepted" } });
    expect(mail.sent.map((m) => m.to)).toEqual([first.email]);
    expect(await reminderRows(second.shopId)).toHaveLength(0);
  });

  it("stops after three failed sends in a row, and when the time budget is used up", async () => {
    for (let i = 0; i < 5; i++) await makeVendor();

    mail.failAll = true;
    const broken = await run();
    expect(broken).toMatchObject({ stopped: "send_failures", summary: { sent: 0, failed: 3, skipped: 0, remaining: 2 } });
    expect(mail.startedAt).toHaveLength(3);
    expect(await reminderRows()).toHaveLength(0);

    mail.failAll = false;
    const outOfTime = await run({ runBudgetMs: 0 });
    expect(outOfTime).toMatchObject({ stopped: "time_budget", summary: { sent: 1, failed: 0, remaining: 4 } });

    // The next run picks up the rest; the vendor already reminded is skipped.
    const rest = await run();
    expect(rest).toMatchObject({ stopped: null, summary: { sent: 4, failed: 0, skipped: 1, remaining: 0 } });
    expect(await reminderRows()).toHaveLength(5);
  });
});

describe("getVendorMouReminderEmail", () => {
  /** Renders as the deployment whose secondary language is `secondary` (a fresh lib/i18n-config.ts). */
  async function render(secondary: string, locale?: string) {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SECONDARY_LOCALE = secondary;
    const { getVendorMouReminderEmail } = await import("@/lib/email");
    return getVendorMouReminderEmail({ vendorName: "Asha", shopName: "Asha Handlooms", mouVersion: "9.9.9", locale });
  }

  it("renders in English, Hindi and Arabic; a language the deployment doesn't have falls back to English", async () => {
    const en = await render("hi", "en");
    expect(en).toContain('<html lang="en" dir="ltr">');
    expect(en).toContain("Hello Asha,");
    expect(en).toContain("<strong>Asha Handlooms</strong>");
    expect(en).toContain('<span dir="ltr">9.9.9</span>');
    expect(en).toContain('href="mailto:support@linknsmile.com"');
    expect(await render("hi")).toBe(en);

    const hi = await render("hi", "hi");
    expect(hi).toContain('<html lang="hi" dir="ltr">');
    expect(hi).toContain("नमस्ते Asha,");
    expect(hi).toContain("<strong>Asha Handlooms</strong>");
    expect(await render("hi", "ar")).toBe(en);

    const ar = await render("ar", "ar");
    expect(ar).toContain('<html lang="ar" dir="rtl">');
    expect(ar).toContain("مرحبًا Asha،");
    expect(ar).toContain('<span dir="ltr">9.9.9</span>');
    expect(await render("ar", "hi")).toBe(en);
  });
});
