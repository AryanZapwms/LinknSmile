// lib/i18n-config.ts
//
// Single source of truth for which languages this deployment supports —
// client and server. Driven by NEXT_PUBLIC_SECONDARY_LOCALE, optional and
// defaulting to unset (English-only), so this is a no-op for any
// deployment that doesn't set it. Same client-safe pattern as
// lib/currency.ts/lib/site-config.ts: reads process.env directly rather
// than importing lib/env.ts, so it stays safe to import from "use client"
// components.
//
// Path B architecture (PROJECT_SOURCE_OF_TRUTH.md §2): each deployment is
// a separate DB/domain with exactly two active languages — English
// (always, implicit) plus this one optional secondary. This is NOT a
// global N-language switcher; there is deliberately no list of every
// possible locale here, just "is there a second one, and what is it."
//
// Distinct from lib/currency.ts's LOCALE (e.g. "en-IN") — that's an Intl
// formatting locale (date/currency display), unrelated to which language
// the UI text itself is rendered in. Don't confuse the two.

export const DEFAULT_LOCALE = "en";

export const SECONDARY_LOCALE = process.env.NEXT_PUBLIC_SECONDARY_LOCALE || "";

/** All locales this deployment actually supports — one or two entries. */
export const SUPPORTED_LOCALES: string[] = SECONDARY_LOCALE
  ? [DEFAULT_LOCALE, SECONDARY_LOCALE]
  : [DEFAULT_LOCALE];

// Locales that read right-to-left. Only Arabic today — extend this set,
// not the RTL logic itself, if a future deployment adds another RTL
// language.
const RTL_LOCALES = new Set(["ar"]);

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}

/** Human-readable label for the locale switcher UI. */
export const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  ar: "العربية",
};
