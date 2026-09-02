import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Registered as the first thing register() does — ahead of this
  // function's own dynamic sentry.*.config imports below, and long before
  // next-auth/react's module-scope `new URL()` call (which only loads on
  // the first request that renders AuthSessionProvider). Logging only —
  // deliberately does NOT prevent the default crash/exit behavior.
  process.on("uncaughtException", (err) => {
    console.error("=== GLOBAL_UNCAUGHT_EXCEPTION ===");
    console.error("message:", err.message);
    console.error("stack:", err.stack);
    console.error("==================================");
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
