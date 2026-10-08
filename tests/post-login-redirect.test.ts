// Where the login form sends a signed-in user (lib/post-login-redirect.ts):
// a vendor with the current MOU still to accept goes to /vendor/mou, then
// ?callbackUrl= when it is a path on this site, then the role's home.
// The MOU state comes from the real GET /api/vendor/status handler, against
// an in-memory MongoDB.

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let redirect: typeof import("@/lib/post-login-redirect");
let email: typeof import("@/lib/email");
let CURRENT_MOU_VERSION: string;
let statusGet: (req: any) => Promise<Response>;
let statusCalls: string[] = [];
let seq = 0;

/** Stands in for the browser's fetch: runs the status route as the signed-in user. */
const statusFetch = (async (input: RequestInfo | URL) => {
  statusCalls.push(String(input));
  const { NextRequest } = await import("next/server");
  return statusGet(new NextRequest(new URL(String(input), "http://localhost")));
}) as typeof fetch;

/** Signs in as a new user and returns their role. `accepted`: true = current MOU version, a string = that version. */
async function signInAs(role: string, o: { accepted?: boolean | string; withShop?: boolean } = {}) {
  const n = ++seq;
  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  const hasShop = role === "shop_owner" && o.withShop !== false;
  await db.collection("users").insertOne({ _id: userId, email: `u${n}@example.com`, name: `U${n}`, role, isActive: true, isVerified: true, ...(hasShop ? { shopId } : {}) });
  if (hasShop) {
    await db.collection("shops").insertOne({
      _id: shopId, ownerId: userId, shopName: `Shop ${n}`, slug: `shop-${n}`, isApproved: true, isActive: true,
      address: { street: "s", city: "c", state: "st", pincode: "400001" }, contactInfo: { phone: "9", email: `s${n}@e.com` },
    });
  }
  if (o.accepted) {
    await db.collection("vendormouacceptances").insertOne({ userId, shopId, mouVersion: o.accepted === true ? CURRENT_MOU_VERSION : o.accepted, acceptedAt: new Date(), ipAddress: "t", userAgent: "t" });
  }
  auth.session = { user: { id: String(userId), email: `u${n}@example.com`, name: `U${n}`, role, shopId: hasShop ? String(shopId) : null } };
  return role;
}
const resolve = (role: string | null | undefined, callbackUrl?: string | null) => redirect.resolvePostLoginPath(role, callbackUrl, statusFetch);

beforeAll(async () => {
  db = await startTestDb();
  redirect = await import("@/lib/post-login-redirect");
  email = await import("@/lib/email");
  ({ CURRENT_MOU_VERSION } = await import("@/lib/mou-content"));
  statusGet = (await import("@/app/api/vendor/status/route")).GET;
  await import("@/lib/models/vendor-subscription");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(() => {
  auth.session = null;
  statusCalls = [];
});

describe("safeCallbackPath", () => {
  it("keeps paths on this site, with their query and hash", () => {
    expect(redirect.safeCallbackPath("/vendor/mou")).toBe("/vendor/mou");
    expect(redirect.safeCallbackPath("/profile/orders?tab=open#latest")).toBe("/profile/orders?tab=open#latest");
    expect(redirect.safeCallbackPath("/%2F%2Fevil.example")).toBe("/%2F%2Fevil.example"); // an (unknown) page here, not another site
  });

  it("rejects anything that would leave the site", () => {
    for (const raw of [null, undefined, "", "vendor/mou", "https://evil.example/x", "javascript:alert(1)", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "/.//evil.example", "/..//evil.example"]) {
      expect(redirect.safeCallbackPath(raw), JSON.stringify(raw)).toBeNull();
    }
  });
});

// app/vendor/mou/page.tsx sends the vendor to ?next= after they accept. It
// reads the value exactly as below: searchParams.get("next"), i.e. already
// percent-decoded, then safeCallbackPath; null means "go to /vendor".
describe("?next= on /vendor/mou", () => {
  const nextFrom = (url: string) => redirect.safeCallbackPath(new URL(url, "http://localhost").searchParams.get("next"));

  it("follows the path the vendor layout put there", () => {
    expect(nextFrom(`/vendor/mou?next=${encodeURIComponent("/vendor/products")}`)).toBe("/vendor/products");
    expect(nextFrom("/vendor/mou?next=/vendor/orders")).toBe("/vendor/orders");
    expect(nextFrom("/vendor/mou")).toBeNull();
  });

  it("drops values that would leave the site, however they are written in the link", () => {
    for (const link of [
      "/vendor/mou?next=//evil.example",
      "/vendor/mou?next=%2F%2Fevil.example",
      "/vendor/mou?next=/\\evil.example",
      "/vendor/mou?next=/%5Cevil.example",
      "/vendor/mou?next=%2F%5Cevil.example",
      "/vendor/mou?next=/%09/evil.example",
      "/vendor/mou?next=/%0A/evil.example",
      "/vendor/mou?next=https://evil.example",
      "/vendor/mou?next=https%3A%2F%2Fevil.example%2Fvendor",
    ]) {
      expect(nextFrom(link), link).toBeNull();
    }
  });

  // The check this replaced: starts with "/" and not with "//".
  it("covers what the previous first-characters check let through", () => {
    const previousCheck = (raw: string) => raw.startsWith("/") && !raw.startsWith("//");
    for (const raw of ["/\\evil.example", "/\t/evil.example", "/\n/evil.example"]) {
      expect(previousCheck(raw), JSON.stringify(raw)).toBe(true);
      expect(new URL(raw, "https://linknsmile.example").host).toBe("evil.example"); // where a browser would go
      expect(redirect.safeCallbackPath(raw), JSON.stringify(raw)).toBeNull();
    }
    expect(previousCheck("//evil.example")).toBe(false);
    expect(redirect.safeCallbackPath("//evil.example")).toBeNull();
  });
});

describe("resolvePostLoginPath", () => {
  it("vendor who hasn't accepted the current MOU → /vendor/mou, whatever callbackUrl says", async () => {
    await signInAs("shop_owner");
    expect(await resolve("shop_owner")).toBe("/vendor/mou");
    expect(await resolve("shop_owner", "/vendor/orders")).toBe("/vendor/mou");
    expect(statusCalls).toEqual(["/api/vendor/status", "/api/vendor/status"]);

    // Accepting an older version doesn't count.
    await signInAs("shop_owner", { accepted: "0.0.1" });
    expect(await resolve("shop_owner", "/")).toBe("/vendor/mou");
  });

  it("vendor who has accepted → callbackUrl when given, otherwise home as before", async () => {
    await signInAs("shop_owner", { accepted: true });
    expect(await resolve("shop_owner")).toBe("/");
    expect(await resolve("shop_owner", "/vendor/mou")).toBe("/vendor/mou");
    expect(await resolve("shop_owner", "/vendor/orders?status=new")).toBe("/vendor/orders?status=new");
    expect(await resolve("shop_owner", "https://evil.example")).toBe("/");
  });

  it("a status check that fails never blocks sign-in", async () => {
    await signInAs("shop_owner", { withShop: false }); // GET /api/vendor/status → 404 Shop not found
    expect(await resolve("shop_owner")).toBe("/");
    expect(await resolve("shop_owner", "/vendor-apply")).toBe("/vendor-apply");

    const offline = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    expect(await redirect.resolvePostLoginPath("shop_owner", "/vendor/mou", offline)).toBe("/vendor/mou");
    expect(await redirect.resolvePostLoginPath("shop_owner", null, offline)).toBe("/");
    const broken = (async () => new Response("<html>502</html>", { status: 502 })) as unknown as typeof fetch;
    expect(await redirect.resolvePostLoginPath("shop_owner", null, broken)).toBe("/");
  });

  it("customers and admins keep their usual destination, honour callbackUrl, and are never MOU-checked", async () => {
    await signInAs("user");
    expect(await resolve("user")).toBe("/");
    expect(await resolve("user", "/profile/orders")).toBe("/profile/orders");
    expect(await resolve("user", "//evil.example")).toBe("/");
    await signInAs("admin");
    expect(await resolve("admin")).toBe("/admin");
    expect(await resolve("admin", "/admin/vendors/mou")).toBe("/admin/vendors/mou");
    expect(await resolve("admin", "/\\evil.example")).toBe("/admin");
    expect(await resolve(undefined)).toBe("/");
    expect(statusCalls).toEqual([]);
  });
});

describe("MOU reminder email link", () => {
  it("goes through the login page with a callbackUrl that lands the vendor on /vendor/mou", async () => {
    const html = await email.getVendorMouReminderEmail({ vendorName: "Asha", shopName: "Asha Handlooms", mouVersion: CURRENT_MOU_VERSION });
    const href = html.match(/<a href="([^"]+)" style="background/)?.[1];
    expect(href).toBe("http://localhost:3000/auth/login?callbackUrl=%2Fvendor%2Fmou");
    expect(redirect.loginPathWithCallback(redirect.VENDOR_MOU_PATH)).toBe("/auth/login?callbackUrl=%2Fvendor%2Fmou");

    // What the login form reads from that URL, for a vendor before and after accepting.
    const callbackUrl = new URL(href!).searchParams.get("callbackUrl");
    expect(callbackUrl).toBe("/vendor/mou");
    await signInAs("shop_owner");
    expect(await resolve("shop_owner", callbackUrl)).toBe("/vendor/mou");
    await signInAs("shop_owner", { accepted: true });
    expect(await resolve("shop_owner", callbackUrl)).toBe("/vendor/mou");
  });
});
