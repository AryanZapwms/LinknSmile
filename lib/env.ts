/**
 * lib/env.ts
 *
 * Validates all required environment variables at startup.
 * Import this at the top of lib/db.ts (or any server-only module that runs early).
 *
 * Usage:
 *   import "@/lib/env";
 *
 * The process will throw immediately with a clear message if anything is missing,
 * instead of failing silently mid-request with a cryptic error.
 */

// Vars required no matter which payment gateway is configured.
const alwaysRequiredEnvVars = [
  "MONGODB_URI",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "GMAIL_EMAIL",
  "GMAIL_APP_PASSWORD",
] as const;

// Vars required only for the selected PAYMENT_GATEWAY. Only "razorpay"
// exists today — this map is groundwork so a second gateway can be added
// later (new key + its own required vars) without another rewrite of
// validateEnv(). Not a real multi-gateway implementation yet.
const paymentGatewayRequiredEnvVars = {
  razorpay: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "NEXT_PUBLIC_RAZORPAY_KEY_ID"],
  // Tap (developers.tap.company), added 2026-08-19 for UAE/Qatar/Saudi
  // deployments. Only a secret key is needed — Tap's checkout is a
  // server-driven hosted redirect, not a client-side widget, so unlike
  // Razorpay there's no public/publishable key for this integration to use.
  tap: ["TAP_SECRET_KEY"],
} as const;

type PaymentGateway = keyof typeof paymentGatewayRequiredEnvVars;

// Defaults to "razorpay" so every existing deployment (none of which set
// this var yet) validates exactly the same vars it always has.
const PAYMENT_GATEWAY = (process.env.PAYMENT_GATEWAY || "razorpay") as PaymentGateway;

function validateEnv() {
  // Only run on the server
  if (typeof window !== "undefined") return;

  const gatewayVars = paymentGatewayRequiredEnvVars[PAYMENT_GATEWAY];
  if (!gatewayVars) {
    throw new Error(
      `\n\n❌ Unknown PAYMENT_GATEWAY "${PAYMENT_GATEWAY}". Supported: ${Object.keys(paymentGatewayRequiredEnvVars).join(", ")}\n\n`
    );
  }

  const requiredEnvVars = [...alwaysRequiredEnvVars, ...gatewayVars];
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `\n\n❌ Missing required environment variables:\n\n` +
        missing.map((k) => `   • ${k}`).join("\n") +
        `\n\nCopy .env.example to .env.local and fill in the missing values.\n`
    );
  }
}

validateEnv();

// Export typed env for convenience — use this instead of process.env directly
export const env = {
  MONGODB_URI: process.env.MONGODB_URI!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
  GMAIL_EMAIL: process.env.GMAIL_EMAIL!,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD!,
  PAYMENT_GATEWAY,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID!,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET!,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  // Only actually set (and required) when PAYMENT_GATEWAY=tap — see
  // paymentGatewayRequiredEnvVars above. `!` here matches the existing
  // RAZORPAY_KEY_ID pattern: a compile-time assertion only, not a runtime
  // guarantee when a different gateway is active.
  TAP_SECRET_KEY: process.env.TAP_SECRET_KEY!,
  // Optional
  EMAIL_FROM: process.env.EMAIL_FROM ?? process.env.GMAIL_EMAIL!,
  // Currency/locale for a given country deployment. Must be readable from
  // client ("use client") code too (e.g. lib/facebook-pixel.ts runs entirely
  // in the browser), so these are NEXT_PUBLIC_-prefixed — plain CURRENCY_CODE/
  // LOCALE would silently be undefined in client bundles. Optional, default
  // to India's current values so this is a no-op for the existing deployment.
  // lib/currency.ts is the actual single source of truth for formatting —
  // read these from there, not from this object, in code that needs to work
  // in client components (importing this file client-side would also try to
  // inline server-only secrets like MONGODB_URI as undefined).
  CURRENCY_CODE: process.env.NEXT_PUBLIC_CURRENCY_CODE || "INR",
  LOCALE: process.env.NEXT_PUBLIC_LOCALE || "en-IN",
  // Translation language, added 2026-08-21 (i18n Step 8) — distinct from
  // LOCALE above, which only drives Intl date/currency formatting, never
  // translation. Optional; unset means English-only (a no-op for the
  // current deployment). lib/i18n-config.ts is the actual single source of
  // truth — read from there in code that needs to work client-side, same
  // reasoning as CURRENCY_CODE/LOCALE.
  SECONDARY_LOCALE: process.env.NEXT_PUBLIC_SECONDARY_LOCALE || "",
  // Client-visible mirror of PAYMENT_GATEWAY, added 2026-08-19 — the
  // checkout page and vendor subscription-renewal flow need to know which
  // gateway is active to pick the right widget-vs-redirect UI and the
  // right route tree (/api/razorpay/* vs /api/tap/*). PAYMENT_GATEWAY
  // itself isn't NEXT_PUBLIC_-prefixed, so it's invisible to client code —
  // same reasoning as CURRENCY_CODE/NEXT_PUBLIC_CURRENCY_CODE above.
  NEXT_PUBLIC_PAYMENT_GATEWAY: process.env.NEXT_PUBLIC_PAYMENT_GATEWAY || "razorpay",
  // Image-serving hostnames for next.config.mjs (comma-separated) and
  // third-party tracking/monitoring IDs, added 2026-08-19 — see
  // lib/site-config.ts, the actual single source of truth for the latter
  // (same client-safety reasoning as CURRENCY_CODE/LOCALE above). Listed
  // here too for discoverability/consistency with the rest of this file.
  NEXT_PUBLIC_IMAGE_HOSTNAMES:
    process.env.NEXT_PUBLIC_IMAGE_HOSTNAMES || "linknsmile.com,care.linknsmile.com",
  SENTRY_DSN:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://45176dfa3998ff88a2d6407caa15c137@o4511505865048064.ingest.us.sentry.io/4511505866293248",
  FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID || "997663834042843",
  GTM_ID: process.env.NEXT_PUBLIC_GTM_ID || "GTM-KTP32WN",
  GOOGLE_ADS_ID: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-602275335",
  GOOGLE_ADS_CONVERSION_LABEL:
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || "U1R3CO3tn6wbEIf8l58C",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
} as const;
