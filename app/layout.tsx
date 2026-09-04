// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
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
import { GTM_ID, IS_INDIA } from "@/lib/site-config";
import { isRtlLocale } from "@/lib/i18n-config";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

// Arabic-optimized pairing for the AE deployment — only registers the
// --font-cairo CSS variable here; app/globals.css decides when it's
// actually used (AE + RTL only), so this has zero effect on India.
const _cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
});

const getBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) return raw.split(",")[0].trim();
  if (process.env.NODE_ENV === "production") return "https://linknsmile.com";
  return `http://localhost:${process.env.PORT || 3004}`;
};

const baseUrlString = getBaseUrl();
let metadataBaseUrl: URL;
try {
  metadataBaseUrl = new URL(baseUrlString);
} catch (err) {
  console.error("=== METADATA_BASE_URL_DEBUG ===");
  console.error("baseUrlString:", JSON.stringify(baseUrlString));
  console.error("raw env NEXT_PUBLIC_SITE_URL:", JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL));
  console.error("stack:", (err as Error).stack);
  console.error("===============================");
  throw err;
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
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
    <html
      lang={locale}
      dir={dir}
      data-region={IS_INDIA ? "in" : "ae"}
      className={`${_geist.className} ${_geistMono.className} ${_cairo.variable}`}
    >
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
