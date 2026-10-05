// The web jwt callback's periodic DB re-check (lib/auth-options.ts), which
// now goes through lib/auth-state.ts shared with mobile refresh.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestDb, stopTestDb } from "./helpers/mongo";

type Db = NonNullable<typeof mongoose.connection.db>;
let db: Db;
let jwtCallback: (args: any) => Promise<any>;

beforeAll(async () => {
  db = await startTestDb();
  const { authOptions } = await import("@/lib/auth-options");
  jwtCallback = authOptions.callbacks!.jwt as any;
});
afterAll(stopTestDb);

describe("NextAuth jwt callback re-check", () => {
  it("refreshes role/shopId from the DB when stale, and revokes deactivated or deleted users", async () => {
    const _id = new mongoose.Types.ObjectId();
    const shopId = new mongoose.Types.ObjectId();
    await db.collection("users").insertOne({ _id, email: "w@example.com", name: "W", role: "shop_owner", shopId, isActive: true });
    const stale = { id: String(_id), role: "user", shopId: null, checkedAt: Date.now() - 2 * 60 * 60 * 1000 };

    const t = await jwtCallback({ token: { ...stale } });
    expect(t).toMatchObject({ role: "shop_owner", shopId: String(shopId) });
    expect(t.checkedAt).toBeGreaterThan(stale.checkedAt);

    // Fresh tokens are not re-checked.
    const fresh = { ...stale, checkedAt: Date.now() };
    expect(await jwtCallback({ token: { ...fresh } })).toMatchObject({ role: "user" });

    await db.collection("users").updateOne({ _id }, { $set: { isActive: false } });
    await expect(jwtCallback({ token: { ...stale } })).rejects.toThrow("SessionRevoked");
    await expect(jwtCallback({ token: { ...fresh }, trigger: "update" })).rejects.toThrow("SessionRevoked");

    await db.collection("users").deleteOne({ _id });
    await expect(jwtCallback({ token: { ...stale } })).rejects.toThrow("SessionRevoked");
  });

  it("keeps the token when the DB is unreachable", async () => {
    const { User } = await import("@/lib/models/user");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi.spyOn(User, "findById").mockImplementationOnce(() => {
      throw new Error("db down");
    });
    const token = { id: new mongoose.Types.ObjectId().toString(), role: "user", checkedAt: 0 };
    expect(await jwtCallback({ token: { ...token } })).toMatchObject({ role: "user", checkedAt: 0 });
    spy.mockRestore();
  });
});
