// POST/DELETE /api/users/push-token and the Expo sender in
// lib/services/push-notification.ts (fetch is stubbed — no network).

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { initModels, startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let route: typeof import("@/app/api/users/push-token/route");
let push: typeof import("@/lib/services/push-notification");
let sign: typeof import("@/lib/mobile-tokens").signAccessToken;

let seq = 0;
async function makeUser(pushTokens: string[] = []) {
  const _id = new mongoose.Types.ObjectId();
  await db.collection("users").insertOne({ _id, email: `p${++seq}@e.com`, name: "P", role: "user", isActive: true, pushTokens });
  const bearer = sign({ id: String(_id), email: "", name: "P", role: "user", shopId: null }, "f").token;
  return { _id, bearer };
}
const tokensOf = async (_id: mongoose.Types.ObjectId) => (await db.collection("users").findOne({ _id }))?.pushTokens;
const T = (n: number | string) => `ExponentPushToken[tok${n}]`;

beforeAll(async () => {
  db = await startTestDb();
  route = await import("@/app/api/users/push-token/route");
  push = await import("@/lib/services/push-notification");
  ({ signAccessToken: sign } = await import("@/lib/mobile-tokens"));
  await initModels();
});
afterAll(stopTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PUSH_NOTIFICATIONS_ENABLED;
});

describe("/api/users/push-token", () => {
  it("registers with dedupe, moves a device's token away from its previous account, caps at 10", async () => {
    const a = await makeUser();
    const b = await makeUser([T("shared")]);
    const reg = (u: { bearer: string }, token: string) => call(route.POST, "/api/users/push-token", { bearer: u.bearer, body: { token } });

    expect(await reg(a, T(1))).toMatchObject({ status: 200, body: { success: true } });
    await reg(a, T(1));
    expect(await tokensOf(a._id)).toEqual([T(1)]);

    await reg(a, T("shared"));
    expect(await tokensOf(b._id)).toEqual([]);
    expect(await tokensOf(a._id)).toEqual([T(1), T("shared")]);

    for (let i = 2; i <= 12; i++) await reg(a, T(i));
    const list = await tokensOf(a._id);
    expect(list).toHaveLength(10);
    expect(list?.at(-1)).toBe(T(12));
    expect(list).not.toContain(T(1));
  });

  it("DELETE removes it; validation and auth errors have codes", async () => {
    const u = await makeUser([T("x"), T("y")]);
    expect((await call(route.DELETE, "/api/users/push-token", { method: "DELETE", bearer: u.bearer, body: { token: T("x") } })).status).toBe(200);
    expect(await tokensOf(u._id)).toEqual([T("y")]);
    expect(await call(route.POST, "/api/users/push-token", { bearer: u.bearer, body: { token: "not-a-token" } })).toMatchObject({ status: 400, body: { code: "VALIDATION_ERROR" } });
    expect(await call(route.POST, "/api/users/push-token", { body: { token: T(1) } })).toMatchObject({ status: 401, body: { code: "UNAUTHORIZED" } });
  });
});

describe("Expo push sender", () => {
  it("is a no-op while PUSH_NOTIFICATIONS_ENABLED is not 'true'", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const u = await makeUser([T("off")]);
    await push.sendPushToUsers([u._id], "t", "b");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends to vendors' devices, and removes DeviceNotRegistered tokens", async () => {
    process.env.PUSH_NOTIFICATIONS_ENABLED = "true";
    const owner = await makeUser([T("live"), T("dead"), "garbage"]);
    const shopId = new mongoose.Types.ObjectId();
    await db.collection("shops").insertOne({ _id: shopId, ownerId: owner._id, shopName: "S", slug: `s-${seq}` });
    const fetchSpy = vi.fn(async (_url: string, init: any) => {
      const msgs = JSON.parse(init.body);
      return new Response(JSON.stringify({ data: msgs.map((m: any) => (m.to === T("dead") ? { status: "error", details: { error: "DeviceNotRegistered" } } : { status: "ok" })) }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    await push.sendPushNotificationToVendor(shopId, "Order", "New order", { screen: "orders" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://exp.host/--/api/v2/push/send");
    expect(JSON.parse(init.body)).toEqual([
      { to: T("live"), title: "Order", body: "New order", data: { screen: "orders" }, sound: "default" },
      { to: T("dead"), title: "Order", body: "New order", data: { screen: "orders" }, sound: "default" },
    ]);
    expect(await tokensOf(owner._id)).toEqual([T("live"), "garbage"]);
  });

  it("never throws: network failure, non-2xx, and DB errors are logged", async () => {
    process.env.PUSH_NOTIFICATIONS_ENABLED = "true";
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const u = await makeUser([T("n")]);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    await expect(push.sendPushToUsers([u._id], "t", "b")).resolves.toBeUndefined();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(push.sendPushToUsers([u._id], "t", "b")).resolves.toBeUndefined();
    await expect(push.sendPushNotificationToMultipleVendors(["not-an-id"], "t", "b")).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalled();
  });
});
