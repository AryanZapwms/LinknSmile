// The /api/[...path] file-serving catch-all must know every real API
// folder, and /api/payment-settings/public must be a real route (the web
// checkout calls it).

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestDb, stopTestDb } from "./helpers/mongo";
import { call } from "./helpers/http";

let db: NonNullable<typeof mongoose.connection.db>;
beforeAll(async () => {
  db = await startTestDb();
});
afterAll(stopTestDb);

describe("RESERVED_API_PREFIXES", () => {
  it("lists every folder in app/api (except the catch-all itself)", async () => {
    const { RESERVED_API_PREFIXES } = await import("@/lib/reserved-api-prefixes");
    const folders = fs
      .readdirSync(path.join(process.cwd(), "app", "api"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("["))
      .map((d) => d.name);
    const missing = folders.filter((f) => !RESERVED_API_PREFIXES.includes(f));
    expect(missing, `add to lib/reserved-api-prefixes.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("the catch-all 404s reserved prefixes without a file lookup", async () => {
    const { GET } = await import("@/app/api/[...path]/route");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await GET(new Request("http://localhost/api/payment-settings/public") as any, { params: Promise.resolve({ path: ["payment-settings", "public"] }) });
    expect(res.status).toBe(404);
    expect(log.mock.calls.some((c) => String(c[0]).includes("FILE REQUEST DEBUG"))).toBe(false);
    log.mockRestore();
  });
});

describe("GET /api/payment-settings/public", () => {
  it("is a real route returning the admin's settings, same as the admin path", async () => {
    const { GET } = await import("@/app/api/payment-settings/public/route");
    const { GET: adminGET } = await import("@/app/api/admin/payment-settings/public/route");
    expect((await call(GET, "/api/payment-settings/public")).body).toEqual({ enableCOD: true, enableRazorpay: true });
    await db.collection("paymentsettings").insertOne({ enableCOD: false, enableRazorpay: true });
    const res = await call(GET, "/api/payment-settings/public");
    expect(res).toMatchObject({ status: 200, body: { enableCOD: false, enableRazorpay: true } });
    expect((await call(adminGET, "/api/admin/payment-settings/public")).body).toEqual(res.body);
  });
});
