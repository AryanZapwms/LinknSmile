// app/api/app-config/route.ts
// Startup config for the mobile app: the minimum app version this backend
// still supports (the app shows a forced-update screen below it), support
// contacts (PlatformSettings, same source as the web footer), payment
// options, and links. Public, no auth.
//
// MOBILE_MIN_SUPPORTED_VERSION (default "1.0.0") and optional
// MOBILE_LATEST_VERSION are env vars so an incompatible backend change can
// ship with a forced update; per-platform overrides:
// MOBILE_MIN_SUPPORTED_VERSION_IOS / _ANDROID.

import { withCORS } from "@/lib/cors";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PlatformSettings } from "@/lib/models/platform-settings";
import { PaymentSettings } from "@/lib/models/payment-settings";
import { CURRENCY_CODE } from "@/lib/currency";

export const dynamic = "force-dynamic";

const DEFAULT_SUPPORT = { email: "support@linknsmile.com", phone: "+91 8355991099" };

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  const min = process.env.MOBILE_MIN_SUPPORTED_VERSION || "1.0.0";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://linknsmile.com").replace(/\/$/, "");

  let support = DEFAULT_SUPPORT;
  let payments = { cod: true, razorpay: true };
  try {
    await connectDB();
    const [platform, payment] = await Promise.all([
      PlatformSettings.findOne().lean<{ supportEmail?: string; supportPhone?: string }>(),
      PaymentSettings.findOne().lean<{ enableCOD?: boolean; enableRazorpay?: boolean }>(),
    ]);
    support = {
      email: platform?.supportEmail ?? DEFAULT_SUPPORT.email,
      phone: platform?.supportPhone ?? DEFAULT_SUPPORT.phone,
    };
    payments = { cod: payment?.enableCOD ?? true, razorpay: payment?.enableRazorpay ?? true };
  } catch (error) {
    // Defaults keep the app usable; the version gate never depends on the DB.
    console.error("[app-config] settings lookup failed:", error);
  }

  return withCORS(
    NextResponse.json({
      minSupportedAppVersion: {
        ios: process.env.MOBILE_MIN_SUPPORTED_VERSION_IOS || min,
        android: process.env.MOBILE_MIN_SUPPORTED_VERSION_ANDROID || min,
      },
      latestAppVersion: process.env.MOBILE_LATEST_VERSION || null,
      region: "IN",
      currency: CURRENCY_CODE,
      support,
      payments,
      links: {
        website: siteUrl,
        privacyPolicy: `${siteUrl}/privacy-policy`,
        terms: `${siteUrl}/termsofservice`,
        refundPolicy: `${siteUrl}/refund-policy`,
      },
    })
  );
}
