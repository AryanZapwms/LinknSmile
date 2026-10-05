// lib/reserved-api-prefixes.ts
//
// First path segments under /api that belong to real route folders. The
// file-serving catch-all (app/api/[...path]) returns a plain 404 for these
// instead of treating the request as a file lookup. Must list every folder
// in app/api/ — tests/reserved-api-prefixes.test.ts fails when one is missing.

export const RESERVED_API_PREFIXES = [
  "addresses",
  "admin",
  "app-config",
  "auth",
  "blogs",
  "cart",
  "categories",
  "companies",
  "coupons",
  "cron",
  "debug",
  "email",
  "favourites",
  "health",
  "hero-products",
  "home-banner",
  "mobile-auth",
  "orders",
  "payment-settings",
  "platform-settings",
  "pricing",
  "products",
  "promos",
  "razorpay",
  "sentry-example-api",
  "serve-files",
  "serve-upload",
  "setup",
  "shops",
  "tap",
  "test",
  "upload",
  "users",
  "vendor",
  "wishlist",
  // Removed route, kept so old links 404 cleanly instead of hitting the file lookup.
  "temp-update-categories",
];
