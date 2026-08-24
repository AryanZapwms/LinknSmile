// lib/actions/locale.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { LOCALE_COOKIE } from "@/i18n/request";
import { SUPPORTED_LOCALES } from "@/lib/i18n-config";

/** Switches the UI language. Only ever accepts a locale this deployment
 *  actually supports — never trusts an arbitrary client-sent value. If the
 *  caller is logged in, also persists the choice to User.locale so email
 *  sending (which has no cookie/request context of its own) can honor the
 *  user's current preference rather than whatever they registered under. */
export async function setLocale(locale: string) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await connectDB();
    await User.findByIdAndUpdate(session.user.id, { locale });
  }

  revalidatePath("/");
}
