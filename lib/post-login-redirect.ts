// lib/post-login-redirect.ts
//
// Where the login form (components/auth/login-form.tsx) sends a user once
// they are signed in, in this order:
//   1. A vendor (shop_owner) who hasn't accepted the current MOU goes to
//      /vendor/mou whatever else was asked for — the vendor panel is locked
//      until they do (app/vendor/layout.tsx, lib/vendor-guard.ts).
//   2. ?callbackUrl=, when it is a path on this site.
//   3. /admin for admins, the home page for everyone else.
//
// Client-safe: no server imports.

export const VENDOR_MOU_PATH = "/vendor/mou";

/** The login page URL that brings the user back to `path` after sign-in. */
export function loginPathWithCallback(path: string): string {
  return `/auth/login?callbackUrl=${encodeURIComponent(path)}`;
}

// Never fetched — only a base to resolve paths against.
const SELF = "http://self.invalid";

/**
 * `raw` as a path on this site (with its query and hash), or null. It is
 * resolved the way a browser would resolve it, because checking the first
 * characters is not enough: "/\host" and "/<tab>/host" both start with a
 * single slash and both navigate to another site.
 */
export function safeCallbackPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  try {
    const url = new URL(raw, SELF);
    if (url.origin !== SELF) return null;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // "/.//host" stays on this site as a URL but normalizes to "//host".
    return path.startsWith("//") ? null : path;
  } catch {
    return null;
  }
}

/**
 * True only when GET /api/vendor/status says the current MOU is not
 * accepted. A failed request, or a vendor account with no shop (404), is
 * "not known to be pending": sign-in carries on as usual, and the vendor
 * area still enforces the MOU itself.
 */
async function vendorMouPending(fetchFn: typeof fetch): Promise<boolean> {
  try {
    const res = await fetchFn("/api/vendor/status");
    if (!res.ok) return false;
    const status = await res.json();
    return status?.mouAccepted === false;
  } catch {
    return false;
  }
}

export async function resolvePostLoginPath(
  role: string | null | undefined,
  rawCallbackUrl: string | null | undefined,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  if (role === "shop_owner" && (await vendorMouPending(fetchFn))) return VENDOR_MOU_PATH;
  return safeCallbackPath(rawCallbackUrl) ?? (role === "admin" ? "/admin" : "/");
}
