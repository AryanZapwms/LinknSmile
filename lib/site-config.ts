// lib/site-config.ts
//
// Single source of truth for third-party tracking/monitoring identifiers
// that were previously hardcoded with zero env var support anywhere —
// Sentry DSN, Facebook Pixel ID, Google Tag Manager container ID, and
// Google Ads conversion tracking. Each is optional and defaults to the
// current India deployment's value, so this is a no-op until a new
// country deployment sets its own.
//
// Deliberately reads process.env directly rather than importing
// lib/env.ts, so this stays safe to import from "use client" components
// (lib/facebook-pixel.ts, components/gtm-scripts.tsx) — importing
// lib/env.ts client-side would also try to inline server-only secrets
// like MONGODB_URI into the bundle. Same pattern as lib/currency.ts.

export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://45176dfa3998ff88a2d6407caa15c137@o4511505865048064.ingest.us.sentry.io/4511505866293248";

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "997663834042843";

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-KTP32WN";

export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-602275335";

export const GOOGLE_ADS_CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || "U1R3CO3tn6wbEIf8l58C";

// Whether this deployment is the India storefront. Reuses the existing
// NEXT_PUBLIC_DEFAULT_COUNTRY var (see components/checkout-form.tsx) rather
// than introducing a second "which country is this" signal — UAE's
// .env.ae.example already sets this to "United Arab Emirates". Gates
// India-only marketing claims (e.g. "Made in India" in the homepage promo
// ticker / footer trust badges) that are factually wrong on any other
// deployment, regardless of active UI language.
export const IS_INDIA = (process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "India") === "India";
