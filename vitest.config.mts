import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

// Integration tests against an in-memory MongoDB replica set
// (mongodb-memory-server) — no network access, no real services.
// Run with `npm test`.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    // Each file gets its own process (and its own in-memory DB + mongoose connection).
    pool: "forks",
    testTimeout: 60_000,
    // First run downloads the MongoDB binary (cached afterwards).
    hookTimeout: 300_000,
  },
});
