// User.lastLoginAt (lib/last-login.ts), against an in-memory MongoDB: written
// once per successful sign-in (mobile login; website password and Google
// sign-in via NextAuth's signIn event) and never when a session or token is
// only refreshed or used.

import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
// The jwt callback reads the locale cookie when it creates a first-time Google user.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let routes: {
  login: typeof import("@/app/api/mobile-auth/login/route").POST;
  refresh: typeof import("@/app/api/mobile-auth/refresh/route").POST;
  addresses: typeof import("@/app/api/addresses/route").GET;
};
let authOptions: typeof import("@/lib/auth-options").authOptions;
let recordLastLogin: typeof import("@/lib/last-login").recordLastLogin;

const PASSWORD = "correct horse battery";
const LONG_AGO = new Date("2026-01-01T00:00:00.000Z");
let seq = 0;

/** A verified, active user whose account was last changed LONG_AGO. */
async function makeUser(over: Record<string, unknown> = {}) {
  const _id = new mongoose.Types.ObjectId();
  const email = `user${++seq}@lastlogin.test`;
  await db.collection("users").insertOne({
    _id, email, name: `User ${seq}`, role: "user", isActive: true, isVerified: true,
    password: await hash(PASSWORD, 4), pushTokens: [], createdAt: LONG_AGO, updatedAt: LONG_AGO, ...over,
  });
  return { _id, id: String(_id), email };
}
const userDoc = (_id: mongoose.Types.ObjectId) => db.collection("users").findOne({ _id });
const lastLoginOf = async (_id: mongoose.Types.ObjectId) => (await userDoc(_id))!.lastLoginAt as Date | undefined;
const login = (email: string, password = PASSWORD) => call(routes.login, "/api/mobile-auth/login", { body: { email, password } });
const isRecent = (value: unknown) => value instanceof Date && Math.abs(Date.now() - value.getTime()) < 30_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// What NextAuth calls, in the order it calls them (core/routes/callback.js):
// the jwt callback first, then the signIn event.
const signInEvent = (args: { user: any; account: any }) => authOptions.events!.signIn!(args as any);
const jwtCallback = (args: any) => (authOptions.callbacks!.jwt as any)(args);
const sessionCallback = (args: any) => (authOptions.callbacks!.session as any)(args);

beforeAll(async () => {
  db = await startTestDb();
  routes = {
    login: (await import("@/app/api/mobile-auth/login/route")).POST,
    refresh: (await import("@/app/api/mobile-auth/refresh/route")).POST,
    addresses: (await import("@/app/api/addresses/route")).GET,
  };
  ({ authOptions } = await import("@/lib/auth-options"));
  ({ recordLastLogin } = await import("@/lib/last-login"));
  await initModels();
});
afterAll(stopTestDb);

describe("mobile app: POST /api/mobile-auth/login", () => {
  it("a successful login records the time, and does not count as a change to the account", async () => {
    const user = await makeUser();
    expect(await lastLoginOf(user._id)).toBeUndefined();

    expect((await login(user.email)).status).toBe(200);

    const stored = await userDoc(user._id);
    expect(isRecent(stored!.lastLoginAt)).toBe(true);
    expect(stored!.updatedAt).toEqual(LONG_AGO);
  });

  it("a failed login records nothing", async () => {
    const wrongPassword = await makeUser();
    const unverified = await makeUser({ isVerified: false });
    const disabled = await makeUser({ isActive: false });

    expect((await login(wrongPassword.email, "not the password")).status).toBe(401);
    expect((await login(unverified.email)).status).toBe(403);
    expect((await login(disabled.email)).status).toBe(403);

    for (const user of [wrongPassword, unverified, disabled]) {
      expect(await lastLoginOf(user._id)).toBeUndefined();
    }
  });

  it("refreshing the tokens, or using them, is not a sign-in", async () => {
    const user = await makeUser();
    const session = (await login(user.email)).body;
    const atLogin = await lastLoginOf(user._id);
    await sleep(20);

    const refreshed = await call(routes.refresh, "/api/mobile-auth/refresh", { body: { refreshToken: session.refreshToken } });
    expect(refreshed.status).toBe(200);
    expect((await call(routes.addresses, "/api/addresses", { bearer: refreshed.body.accessToken })).status).toBe(200);

    expect(await lastLoginOf(user._id)).toEqual(atLogin);
  });

  it("signing in again moves it forward", async () => {
    const user = await makeUser();
    await login(user.email);
    const first = (await lastLoginOf(user._id))!;
    await sleep(20);
    await login(user.email);
    expect((await lastLoginOf(user._id))!.getTime()).toBeGreaterThan(first.getTime());
  });
});

describe("website: NextAuth sign-in", () => {
  it("password sign-in records the time", async () => {
    const user = await makeUser();
    const signedIn = { id: user.id, email: user.email, name: "User", role: "user", shopId: null };

    await jwtCallback({ token: {}, user: signedIn, account: { provider: "credentials", type: "credentials" } });
    expect(await lastLoginOf(user._id)).toBeUndefined(); // not the jwt callback's job
    await signInEvent({ user: signedIn, account: { provider: "credentials", type: "credentials" } });

    const stored = await userDoc(user._id);
    expect(isRecent(stored!.lastLoginAt)).toBe(true);
    expect(stored!.updatedAt).toEqual(LONG_AGO);
  });

  it("Google sign-in records the time for an existing account, whatever the case of the email", async () => {
    const user = await makeUser({ password: undefined });
    // For Google, `user.id` is Google's id for the person, not ours: the account is found by email.
    const fromGoogle = { id: "google-sub-1", email: user.email.toUpperCase(), name: "User" };

    await signInEvent({ user: fromGoogle, account: { provider: "google", type: "oauth" } });

    expect(isRecent(await lastLoginOf(user._id))).toBe(true);
  });

  it("a first Google sign-in creates the account and records the time", async () => {
    const fromGoogle = { id: "google-sub-2", email: "brand.new@lastlogin.test", name: "Brand New" };
    const account = { provider: "google", type: "oauth" };

    await jwtCallback({ token: {}, user: fromGoogle, account }); // creates the user
    await signInEvent({ user: fromGoogle, account });

    const created = await db.collection("users").findOne({ email: fromGoogle.email });
    expect(created).toMatchObject({ name: "Brand New", role: "user" });
    expect(isRecent(created!.lastLoginAt)).toBe(true);
  });

  it("refreshing or reading a session is not a sign-in", async () => {
    const user = await makeUser();
    await signInEvent({ user: { id: user.id, email: user.email }, account: { provider: "credentials" } });
    const atSignIn = await lastLoginOf(user._id);
    await sleep(20);

    const token = { id: user.id, role: "user", shopId: null, checkedAt: Date.now() - 2 * 60 * 60 * 1000 };
    await jwtCallback({ token: { ...token } }); // the hourly re-check against the database
    await jwtCallback({ token: { ...token, checkedAt: Date.now() }, trigger: "update" }); // useSession().update()
    await sessionCallback({ session: { user: {} }, token });

    expect(await lastLoginOf(user._id)).toEqual(atSignIn);
  });

  it("never turns a sign-in into a failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      // Nobody with that email, and an id that is not an id: both resolve.
      await expect(signInEvent({ user: { id: "x", email: "nobody@lastlogin.test" }, account: { provider: "google" } })).resolves.toBeUndefined();
      await expect(recordLastLogin({ id: "not-an-object-id" })).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledTimes(1); // the bad id was logged, not thrown
    } finally {
      error.mockRestore();
    }
  });
});
