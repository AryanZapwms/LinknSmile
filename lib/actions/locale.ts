// lib/actions/locale.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@/i18n/request";
import { SUPPORTED_LOCALES } from "@/lib/i18n-config";

/** Switches the UI language. Only ever accepts a locale this deployment
 *  actually supports — never trusts an arbitrary client-sent value. */
export async function setLocale(locale: string) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/");
}
