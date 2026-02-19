import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthSessionProvider } from "@/components/auth/session-provider"
import { Header } from "@/components/header"
import { PromoBar } from "@/components/promo-bar"
import { Toaster } from "@/components/ui/toaster"
import Footer from "@/components/footer"
import GTMScripts from "@/components/gtm-scripts"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.NODE_ENV === "production") return "https://linknsmile.com"
  return `http://localhost:${process.env.PORT || 3004}`
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "LinkAndSmile | DermaFlay | Vibrissa - Premium Skincare Products",
  description:
    "Discover premium skincare solutions from LinkAndSmile, DermaFlay, and Vibrissa. Professional-grade products for your skin.",
  alternates: { canonical: "https://linknsmile.com" },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${_geist.className} ${_geistMono.className}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/companylogo.jpg" />
      </head>

      <body className="font-sans antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KTP32WN"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <AuthSessionProvider>
          <PromoBar />
          <Header />

          {/* ✅ Client-only analytics scripts */}
          <GTMScripts />

          {children}
          <Footer />
        </AuthSessionProvider>

        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
