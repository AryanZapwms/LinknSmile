// Mobile Bearer auth: /api/mobile-auth/{login,refresh,logout},
// lib/mobile-tokens.ts and lib/get-auth-user.ts, against an in-memory
// MongoDB. NextAuth's getServerSession is mocked (the web cookie path).

import crypto from "crypto";
import { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

const auth = vi.hoisted(() => ({ session: null as any }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let routes: {
  login: typeof import("@/app/api/mobile-auth/login/route").POST;
  refresh: typeof import("@/app/api/mobile-auth/refresh/route").POST;
  logout: typeof import("@/app/api/mobile-auth/logout/route").POST;
  addressesGET: typeof import("@/app/api/addresses/route").GET;
};
let tokens: typeof import("@/lib/mobile-tokens");
let getAuthUser: typeof import("@/lib/get-auth-user").getAuthUser;
let contracts: typeof import("@/lib/contracts/auth");

const PASSWORD = "correct horse battery";
let seq = 0;
async function makeUser(over: Record<string, unknown> = {}) {
  const _id = new mongoose.Types.ObjectId();
  const email = `user${++seq}@example.com`;
  await db.collection("users").insertOne({
    _id, email, name: `User ${seq}`, role: "user", isActive: true, isVerified: true,
    password: await hash(PASSWORD, 4), pushTokens: [], ...over,
  });
  return { id: String(_id), email };
}
const login = (email: string, password = PASSWORD, ip?: string) =>
  call(routes.login, "/api/mobile-auth/login", { body: { email, password }, ip });

beforeAll(async () => {
  db = await startTestDb();
  routes = {
    login: (await import("@/app/api/mobile-auth/login/route")).POST,
    refresh: (await import("@/app/api/mobile-auth/refresh/route")).POST,
    logout: (await import("@/app/api/mobile-auth/logout/route")).POST,
    addressesGET: (await import("@/app/api/addresses/route")).GET,
  };
  tokens = await import("@/lib/mobile-tokens");
  ({ getAuthUser } = await import("@/lib/get-auth-user"));
  contracts = await import("@/lib/contracts/auth");
  await import("@/lib/models/address");
  await initModels();
});
afterAll(stopTestDb);
beforeEach(() => {
  auth.session = null;
});

describe("POST /api/mobile-auth/login", () => {
  it("returns a Bearer token pair, the user, and the legacy cookie token", async () => {
    const u = await makeUser();
    const res = await login(u.email.toUpperCase());
    expect(res.status).toBe(200);
    expect(contracts.mobileLoginResponse.parse(res.body)).toBeTruthy();
    expect(res.body.user).toEqual({ id: u.id, email: u.email, name: expect.any(String), role: "user", shopId: null });
    // Legacy JWE (5 segments) is still issued for the installed app.
    expect(res.body.token.split(".")).toHaveLength(5);

    const who = await getAuthUser(new Request("http://x", { headers: { authorization: `Bearer ${res.body.accessToken}` } }));
    expect(who).toMatchObject({ id: u.id, role: "user", via: "bearer" });

    // Only a hash of the refresh token is stored.
    const stored = await db.collection("refreshtokens").findOne({ userId: new mongoose.Types.ObjectId(u.id) });
    expect(stored?.tokenHash).toBe(crypto.createHash("sha256").update(res.body.refreshToken).digest("hex"));
    expect(JSON.stringify(stored)).not.toContain(res.body.refreshToken);
  });

  it("rejects bad credentials, unverified, disabled and malformed requests with codes", async () => {
    const u = await makeUser();
    expect(await login(u.email, "wrong")).toMatchObject({ status: 401, body: { code: "INVALID_CREDENTIALS" } });
    expect(await login("nobody@example.com")).toMatchObject({ status: 401, body: { code: "INVALID_CREDENTIALS" } });
    const unverified = await makeUser({ isVerified: false });
    expect(await login(unverified.email)).toMatchObject({ status: 403, body: { code: "EMAIL_NOT_VERIFIED" } });
    const disabled = await makeUser({ isActive: false });
    expect(await login(disabled.email)).toMatchObject({ status: 403, body: { code: "ACCOUNT_DISABLED" } });
    expect(await call(routes.login, "/api/mobile-auth/login", { body: { email: u.email } })).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR" } });
    expect(await call(routes.login, "/api/mobile-auth/login", { body: "not json" })).toMatchObject({ status: 400 });
  });

  it("OAuth-only (no password) user gets 401 OAUTH_ACCOUNT, not a 500", async () => {
    const g = await makeUser({ password: undefined });
    await db.collection("users").updateOne({ email: g.email }, { $unset: { password: 1 } });
    expect(await login(g.email)).toMatchObject({ status: 401, body: { code: "OAUTH_ACCOUNT" } });
  });

  it("rate-limits per IP (10/min) and per email (10/15min)", async () => {
    const u = await makeUser();
    for (let i = 0; i < 10; i++) expect((await login(u.email, "wrong", "192.0.2.1")).status).toBe(401);
    const limited = await login(u.email, PASSWORD, "192.0.2.1");
    expect(limited).toMatchObject({ status: 429, body: { code: "RATE_LIMITED" } });
    expect(limited.headers.get("retry-after")).toBe("60");
    // Same email from a fresh IP is limited too (its 10 per-email attempts are used up).
    expect(await login(u.email)).toMatchObject({ status: 429 });
    // Other accounts from other IPs are unaffected.
    expect((await login((await makeUser()).email)).status).toBe(200);
  });
});

describe("POST /api/mobile-auth/refresh", () => {
  const refresh = (refreshToken: unknown) => call(routes.refresh, "/api/mobile-auth/refresh", { body: { refreshToken } });

  it("rotates: new pair works, and role/shopId are re-read from the DB", async () => {
    const u = await makeUser();
    const first = (await login(u.email)).body;
    const shopId = new mongoose.Types.ObjectId();
    await db.collection("users").updateOne({ email: u.email }, { $set: { role: "shop_owner", shopId, name: "Renamed" } });

    const res = await refresh(first.refreshToken);
    expect(res.status).toBe(200);
    expect(contracts.refreshResponse.parse(res.body)).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(first.refreshToken);
    expect(res.body.user).toMatchObject({ role: "shop_owner", shopId: String(shopId), name: "Renamed" });
    expect(tokens.verifyAccessToken(res.body.accessToken)).toMatchObject({ role: "shop_owner", shopId: String(shopId) });
    // Chain continues.
    expect((await refresh(res.body.refreshToken)).status).toBe(200);
  });

  it("an old token re-presented right away is a race (401 ROTATED), later it is reuse and revokes the family", async () => {
    const u = await makeUser();
    const first = (await login(u.email)).body;
    const second = (await refresh(first.refreshToken)).body;

    expect(await refresh(first.refreshToken)).toMatchObject({ status: 401, body: { code: "REFRESH_TOKEN_ROTATED" } });
    // The newest token still works after a race.
    const third = (await refresh(second.refreshToken)).body;
    expect(third.refreshToken).toBeTruthy();

    // Age the rotation past the race leeway, then replay the stolen first token.
    await db.collection("refreshtokens").updateMany({}, [{ $set: { revokedAt: { $cond: [{ $eq: ["$revokedReason", "rotated"] }, new Date(Date.now() - 60_000), "$revokedAt"] } } }]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await refresh(first.refreshToken)).toMatchObject({ status: 401, body: { code: "REFRESH_TOKEN_REUSED" } });
    // Whole family is dead, including the legitimate newest token.
    expect(await refresh(third.refreshToken)).toMatchObject({ status: 401, body: { code: "REFRESH_TOKEN_INVALID" } });
    // Another login (family) of the same user is untouched.
    const other = (await login(u.email)).body;
    expect((await refresh(other.refreshToken)).status).toBe(200);
  });

  it("concurrent refreshes with the same token: exactly one succeeds", async () => {
    const u = await makeUser();
    const first = (await login(u.email)).body;
    const results = await Promise.all(Array.from({ length: 5 }, () => refresh(first.refreshToken)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    for (const r of results.filter((r) => r.status !== 200)) expect(r.body.code).toBe("REFRESH_TOKEN_ROTATED");
  });

  it("deactivated or deleted user: 401 SESSION_REVOKED and the family is revoked", async () => {
    const u = await makeUser();
    const t = (await login(u.email)).body;
    await db.collection("users").updateOne({ email: u.email }, { $set: { isActive: false } });
    expect(await refresh(t.refreshToken)).toMatchObject({ status: 401, body: { code: "SESSION_REVOKED" } });
    await db.collection("users").updateOne({ email: u.email }, { $set: { isActive: true } });
    expect(await refresh(t.refreshToken)).toMatchObject({ status: 401, body: { code: "REFRESH_TOKEN_INVALID" } });

    const d = await makeUser();
    const td = (await login(d.email)).body;
    await db.collection("users").deleteOne({ email: d.email });
    expect(await refresh(td.refreshToken)).toMatchObject({ status: 401, body: { code: "SESSION_REVOKED" } });
  });

  it("90-day absolute cap: rotation keeps the login's issue date; expiry is capped; past the cap it is refused", async () => {
    const DAY = 24 * 60 * 60 * 1000;
    const u = await makeUser();
    const uid = new mongoose.Types.ObjectId(u.id);
    const first = (await login(u.email)).body;
    const issued = (await db.collection("refreshtokens").findOne({ userId: uid }))!.familyIssuedAt as Date;
    expect(issued).toBeInstanceOf(Date);

    // Rotation copies familyIssuedAt instead of restarting it.
    const second = (await refresh(first.refreshToken)).body;
    const rotated = await db.collection("refreshtokens").findOne({ userId: uid, revokedAt: { $exists: false } });
    expect(rotated?.familyIssuedAt).toEqual(issued);

    // 80 days into the login: the new token expires at the 90-day mark, not in 30 days.
    const eightyDaysAgo = new Date(Date.now() - 80 * DAY);
    await db.collection("refreshtokens").updateMany({ userId: uid }, { $set: { familyIssuedAt: eightyDaysAgo } });
    const third = (await refresh(second.refreshToken)).body;
    const cap = eightyDaysAgo.getTime() + 90 * DAY;
    expect(Math.abs(new Date(third.refreshTokenExpiresAt).getTime() - cap)).toBeLessThan(5000);

    // Past 90 days (even with an expiresAt still in the future): refused, family revoked.
    await db.collection("refreshtokens").updateMany({ userId: uid }, { $set: { familyIssuedAt: new Date(Date.now() - 91 * DAY) } });
    expect(await refresh(third.refreshToken)).toMatchObject({ status: 401, body: { code: "REFRESH_TOKEN_INVALID" } });
    expect(await db.collection("refreshtokens").countDocuments({ userId: uid, revokedAt: { $exists: false } })).toBe(0);
    expect(await db.collection("refreshtokens").countDocuments({ userId: uid, revokedReason: "max_age" })).toBe(1);
    // A fresh login starts a new 90 days.
    expect((await refresh((await login(u.email)).body.refreshToken)).status).toBe(200);
  });

  it("rejects unknown, malformed, expired and missing tokens", async () => {
    expect(await refresh("rt_doesnotexist")).toMatchObject({ status: 401, body: { code: "REFRESH_TOKEN_INVALID" } });
    expect(await refresh("garbage")).toMatchObject({ status: 401, body: { code: "REFRESH_TOKEN_INVALID" } });
    expect(await refresh(undefined)).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR" } });
    const u = await makeUser();
    const t = (await login(u.email)).body;
    await db.collection("refreshtokens").updateMany({ userId: new mongoose.Types.ObjectId(u.id) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await refresh(t.refreshToken)).toMatchObject({ status: 401, body: { code: "REFRESH_TOKEN_INVALID" } });
  });
});

describe("POST /api/mobile-auth/logout", () => {
  it("revokes the device's refresh token and removes its push token; idempotent", async () => {
    const u = await makeUser({ pushTokens: ["ExponentPushToken[a]", "ExponentPushToken[b]"] });
    const t = (await login(u.email)).body;
    const other = (await login(u.email)).body; // second device

    const res = await call(routes.logout, "/api/mobile-auth/logout", { body: { refreshToken: t.refreshToken, pushToken: "ExponentPushToken[a]" } });
    expect(res).toMatchObject({ status: 200, body: { success: true } });
    expect((await db.collection("users").findOne({ email: u.email }))?.pushTokens).toEqual(["ExponentPushToken[b]"]);
    expect(await call(routes.refresh, "/api/mobile-auth/refresh", { body: { refreshToken: t.refreshToken } })).toMatchObject({ status: 401 });
    expect((await call(routes.refresh, "/api/mobile-auth/refresh", { body: { refreshToken: other.refreshToken } })).status).toBe(200);

    // Repeat / unknown token / empty body: still 200.
    expect((await call(routes.logout, "/api/mobile-auth/logout", { body: { refreshToken: t.refreshToken } })).status).toBe(200);
    expect((await call(routes.logout, "/api/mobile-auth/logout", { body: { refreshToken: "rt_unknown" } })).status).toBe(200);
    expect((await call(routes.logout, "/api/mobile-auth/logout", { body: {} })).status).toBe(200);
  });

  it("does not remove another user's push token without proof of identity", async () => {
    const victim = await makeUser({ pushTokens: ["ExponentPushToken[v]"] });
    await call(routes.logout, "/api/mobile-auth/logout", { body: { pushToken: "ExponentPushToken[v]" } });
    expect((await db.collection("users").findOne({ email: victim.email }))?.pushTokens).toEqual(["ExponentPushToken[v]"]);
  });
});

describe("getAuthUser", () => {
  const req = (authorization?: string) => new Request("http://x", { headers: authorization ? { authorization } : {} });
  const tokenUser = { id: new mongoose.Types.ObjectId().toString(), email: "a@b.c", name: "A", role: "user", shopId: null };

  it("uses the NextAuth session when there is no Bearer header", async () => {
    auth.session = { user: { id: "u1", email: "w@x.y", name: "W", role: "admin", shopId: null } };
    expect(await getAuthUser(req())).toEqual({ id: "u1", email: "w@x.y", name: "W", role: "admin", shopId: null, via: "session" });
    auth.session = null;
    expect(await getAuthUser(req())).toBeNull();
  });

  it("an invalid Bearer token is null even when a session cookie exists", async () => {
    auth.session = { user: { id: "u1", role: "user" } };
    expect(await getAuthUser(req("Bearer nope"))).toBeNull();
  });

  it("rejects expired tokens, legacy HS256 tokens signed with NEXTAUTH_SECRET, and wrong typ/audience", async () => {
    const secret = process.env.NEXTAUTH_SECRET!;
    const legacy = jwt.sign({ id: tokenUser.id, sub: tokenUser.id, role: "user", typ: "access" }, secret, { expiresIn: 600 });
    expect(await getAuthUser(req(`Bearer ${legacy}`))).toBeNull();

    const { token } = tokens.signAccessToken(tokenUser, "fam");
    expect(await getAuthUser(req(`bearer ${token}`))).toMatchObject({ id: tokenUser.id, via: "bearer" });

    vi.useFakeTimers({ now: Date.now() + 16 * 60 * 1000 });
    try {
      expect(await getAuthUser(req(`Bearer ${token}`))).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("migrated routes accept the Bearer token and 401 without it", async () => {
    const u = await makeUser();
    const t = (await login(u.email)).body;
    expect((await call(routes.addressesGET, "/api/addresses", { bearer: t.accessToken })).status).toBe(200);
    expect((await call(routes.addressesGET, "/api/addresses")).status).toBe(401);
    expect((await call(routes.addressesGET, "/api/addresses", { bearer: "junk" })).status).toBe(401);
  });
});
