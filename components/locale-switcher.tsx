// components/locale-switcher.tsx
"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Globe2 } from "lucide-react";
import { setLocale } from "@/lib/actions/locale";
import { DEFAULT_LOCALE, SECONDARY_LOCALE, LOCALE_LABELS } from "@/lib/i18n-config";
import { IS_INDIA } from "@/lib/site-config";

// Renders nothing if this deployment has no secondary locale configured —
// a no-op, matching every other optional-config pattern in this codebase
// (payment gateway, currency, tracking IDs, etc.).
export function LocaleSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  if (!SECONDARY_LOCALE) return null;

  // Only ever two options for a given deployment (Path B — see
  // lib/i18n-config.ts), so a single toggle button is simpler and clearer
  // than a dropdown here.
  const nextLocale = locale === DEFAULT_LOCALE ? SECONDARY_LOCALE : DEFAULT_LOCALE;

  // AE gets a visually stronger toggle — a bordered gold/teal pill instead
  // of a plain text link — since the bilingual EN/AR presence is itself a
  // regional identity signal worth making immediately visible. Purely
  // visual: same button, same handler, same aria-label.
  const className = IS_INDIA
    ? "flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50"
    : "flex h-9 items-center gap-1.5 rounded-full border border-gold-300 bg-gold-50 px-3.5 text-sm font-semibold text-gold-700 shadow-sm transition-colors hover:bg-gold-100 hover:border-gold-400 disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={() => startTransition(() => setLocale(nextLocale))}
      disabled={isPending}
      className={className}
      aria-label={`Switch language to ${LOCALE_LABELS[nextLocale] ?? nextLocale}`}
    >
      <Globe2 className={IS_INDIA ? "h-4 w-4" : "h-4 w-4 text-gold-600"} />
      <span>{LOCALE_LABELS[nextLocale] ?? nextLocale}</span>
    </button>
  );
}
