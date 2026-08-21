// lib/currency.ts
//
// Single source of truth for currency display across the app — client and
// server. Driven by NEXT_PUBLIC_CURRENCY_CODE / NEXT_PUBLIC_LOCALE, both
// optional and defaulting to India's current values, so this is a no-op for
// the existing deployment until those vars are set for a new country.
//
// Deliberately reads process.env directly (not via lib/env.ts's `env`
// export) so this file stays safe to import from "use client" components —
// importing lib/env.ts client-side would also try to inline server-only
// secrets (MONGODB_URI etc.) into the bundle.

export const CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY_CODE || "INR";
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE || "en-IN";

const formatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY_CODE,
});

/** Formats an amount as a currency string, e.g. formatCurrency(1234.5) -> "₹1,234.50". */
export function formatCurrency(amount: number): string {
  return formatter.format(amount);
}

let cachedSymbol: string | null = null;

/** Just the currency symbol/code (e.g. "₹"), for labels like "Price (₹)". */
export function getCurrencySymbol(): string {
  if (cachedSymbol !== null) return cachedSymbol;
  const part = formatter.formatToParts(0).find((p) => p.type === "currency");
  cachedSymbol = part?.value ?? CURRENCY_CODE;
  return cachedSymbol;
}
