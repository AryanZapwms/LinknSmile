// lib/normalize-digits.ts
//
// Converts Arabic-Indic digits (٠-٩, U+0660–U+0669) to standard Western
// digits (0-9). Some Arabic-locale keyboards default to Arabic-Indic
// numerals, so numeric-only fields (OTP codes, etc.) need to accept them
// and normalize before validation/submission — the backend comparison
// expects standard digits regardless of what the user typed.

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeArabicIndicDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}
