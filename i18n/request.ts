// i18n/request.ts
//
// next-intl request config — "without i18n routing" mode (no [locale] URL
// segment, see PROJECT_SOURCE_OF_TRUTH.md §4.18 for why: this codebase has
// ~150 existing routes, and restructuring all of them under app/[locale]/
// for URL-prefixed routing would be a large, risky mechanical migration
// disconnected from actual translation work — not worth it for a
// per-deployment two-locale toggle where there's no need for separate
// crawlable /en/ vs /ar/ URLs (each deployment is already its own
// domain/DB under Path B).
//
// Locale is resolved from a cookie (set by lib/actions/locale.ts), falling
// back to English. Only ever resolves to a locale this deployment actually
// supports (lib/i18n-config.ts's SUPPORTED_LOCALES) — a stale cookie from
// before NEXT_PUBLIC_SECONDARY_LOCALE was set/changed can't select a
// locale with no message catalog.
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { resolveLocaleFromCookieValue } from "@/lib/i18n-config";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocaleFromCookieValue(store.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
