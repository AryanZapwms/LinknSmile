// lib/email-locale.ts
//
// Email sending happens server-side, disconnected from any browser
// session/cookie (webhooks, cron jobs, admin actions) — so unlike the web
// app, it can't read next-intl's per-request locale via i18n/request.ts.
// Instead it resolves language from User.locale (see lib/models/user.ts
// and lib/actions/locale.ts for where that field is captured/kept in
// sync), falling back to English for any user with no value set. Call
// sites pass whatever they already have loaded (usually user.locale
// directly) into resolveEmailLocale(); nothing here does its own DB fetch,
// since the shape of "how to get to the relevant User" varies per call
// site (direct User doc, or Shop.ownerId → User).
//
// Translation itself reuses the exact same messages/{en,hi,ar}.json
// catalogs the web app uses — one source of truth, not a parallel email
// translation system — via next-intl's createTranslator(), the
// non-React counterpart to useTranslations().

import { createTranslator } from "next-intl";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isRtlLocale } from "@/lib/i18n-config";

export function resolveEmailLocale(rawLocale: string | null | undefined): string {
  return rawLocale && SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : DEFAULT_LOCALE;
}

export async function getEmailTranslator(locale: string, namespace: string) {
  const resolvedLocale = resolveEmailLocale(locale);
  const messages = (await import(`@/messages/${resolvedLocale}.json`)).default;
  return createTranslator({ locale: resolvedLocale, messages, namespace });
}

export { isRtlLocale };
