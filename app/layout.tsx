// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { Header } from "@/components/header";
import { PromoBar } from "@/components/promo-bar";
import { CartSync } from "@/components/cart-sync";
import { Toaster } from "@/components/ui/toaster";
import FavouritesLoader from "@/components/FavouritesLoader";
import Footer from "@/components/footer";
import GTMScripts from "@/components/gtm-scripts";
import { GTM_ID } from "@/lib/site-config";
import { isRtlLocale } from "@/lib/i18n-config";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const getBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) return raw.split(",")[0].trim();
  if (process.env.NODE_ENV === "production") return "https://linknsmile.com";
  return `http://localhost:${process.env.PORT || 3004}`;
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "Linknsmile",
  description:
    "Discover premium skincare solutions from Linknsmile. Professional-grade products for your skin.",
  alternates: { canonical: getBaseUrl() },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${_geist.className} ${_geistMono.className}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="../public/linknsmile_newOne.png" />
      </head>

      <body className="font-sans antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthSessionProvider>
            <CartSync />
            <FavouritesLoader />


      <PromoBar />
      <Header />


            {/* ✅ Client-only analytics scripts */}
            <GTMScripts />

            {children}
            <Footer />
          </AuthSessionProvider>
        </NextIntlClientProvider>

        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
