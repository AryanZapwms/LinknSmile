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

    // TEMPORARY DEBUG LOGGING — added 2026-09-17, continuing the ERR_INVALID_URL
    // investigation (see middleware.ts and app/api/auth/[...nextauth]/route.ts).
    // Targeted logging that replicated next-auth's detectOrigin/parseUrl chain came
    // back clean on both PM2 workers on every field, while the same crash still
    // reproduced seconds later with the same malformed duplicated string — so
    // either it's a different request/subsystem than /api/auth/session, or a
    // `new URL()` call our replication didn't actually cover.
    //
    // This patches the global URL constructor here, as early as possible in server
    // startup (ahead of any route/module that might call `new URL()`, including
    // inside next-auth's own compiled node_modules code, which we can't edit
    // directly), so a `new URL()` call whose input looks like the known failure
    // shape — two http(s) URLs concatenated, e.g. "https://x.com, https://x.com"
    // — gets logged with its exact input and a full stack trace BEFORE it has a
    // chance to throw. Always calls the real constructor via super() with the
    // original arguments afterward, so behavior (including throwing on a
    // genuinely invalid URL) is unchanged for every caller — this only adds a log
    // line, it never suppresses or alters the crash. Confirmed
    // node_modules/next-auth's parse-url.js/detect-origin.js use the bare global
    // `URL` (not `require("url").URL`), so this covers them.
    //
    // NOTE: an earlier version of this patch matched on ANY comma in the input
    // and was tested locally before being deployed — that immediately produced
    // false positives from webpack's own dev-mode source-map data URLs
    // (`data:application/json;charset=utf-8;base64,...`), and the same shape
    // (a comma right after the encoding declaration) is also how `data:` image
    // URIs look, which next/image's blur placeholders can legitimately construct
    // in production too. Matching specifically on two `http(s)://` occurrences
    // avoids that noise entirely while still catching the exact known failure
    // shape (and any other-separator variant of the same duplication).
    //
    // IMPORTANT BLIND SPOT: this only sees SERVER-side construction. This same
    // file already notes (see the comment above the sentry import below) that
    // next-auth/react has its own module-scope `new URL()` call that runs in the
    // BROWSER the first time AuthSessionProvider renders — this patch cannot see
    // that call under any circumstances, since it runs in a different process
    // entirely. If this patch also comes back clean while the crash keeps
    // reproducing, the next lead should be a duplicated NEXT_PUBLIC_SITE_URL baked
    // into the client bundle AT BUILD TIME: Next.js inlines NEXT_PUBLIC_* values
    // when `next build` runs in CI, which is a completely separate env-sourcing
    // path from ecosystem.config.js's firstUrl() sanitizer — that sanitizer only
    // cleans the server process's runtime env at PM2 startup and has no effect on
    // what was already baked into a client JS chunk at build time. That would need
    // checking the GitHub Actions build env (or a rebuild), not another server log.
    //
    // Remove this whole block once root-caused.
    const DUPLICATED_URL_PATTERN = /https?:\/\/.*https?:\/\//;
    const OriginalURL = globalThis.URL;
    class ProbedURL extends OriginalURL {
      constructor(input: string | URL, base?: string | URL) {
        if (typeof input === "string" && DUPLICATED_URL_PATTERN.test(input)) {
          console.error("[URL_PROBE] Duplicated-URL-shaped construction:", {
            input,
            base: base === undefined ? undefined : String(base),
            stack: new Error("URL_PROBE stack capture").stack,
            pid: process.pid,
            nodeAppInstance: process.env.NODE_APP_INSTANCE ?? null,
          });
        }
        super(input, base);
      }
    }
    globalThis.URL = ProbedURL;

    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
