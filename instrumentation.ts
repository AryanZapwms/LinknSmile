import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Registered as the first thing the nodejs branch does — ahead of the
    // dynamic sentry.server.config import below, and long before
    // next-auth/react's module-scope `new URL()` call (which only loads on
    // the first request that renders AuthSessionProvider). Logging only —
    // deliberately does NOT prevent the default crash/exit behavior.
    // Guarded to the nodejs runtime: `process.on` isn't a function in the
    // edge-flavored context register() also gets evaluated under, and
    // calling it unconditionally crashes instrumentation loading entirely.
    process.on("uncaughtException", (err) => {
      console.error("=== GLOBAL_UNCAUGHT_EXCEPTION ===");
      console.error("message:", err.message);
      console.error("stack:", err.stack);
      console.error("==================================");
    });

    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
