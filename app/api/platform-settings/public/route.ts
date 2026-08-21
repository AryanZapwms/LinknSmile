import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PlatformSettings } from "@/lib/models/platform-settings";

// Public, read-only subset for client components (footer, contact/about
// pages, bulk-order modals, cart/checkout tax preview, etc.). Mirrors
// app/api/admin/payment-settings/public's shape-and-fallback pattern.
//
// taxRatePercent is included as of 2026-08-21 (tax engine, see
// PROJECT_SOURCE_OF_TRUTH.md §4.17) — cart/checkout use it to show a real
// pre-checkout tax estimate, same as how totalPrice itself is already a
// client-computed preview there. This is display-only: the actual charge
// is always computed server-side via computeOrderPricing at create-order/
// verify-payment/orders time, never trusted from this preview value.
export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }
  try {
    await connectDB();
    const settings = (await PlatformSettings.findOne().lean()) as any;
    return withCORS(
      NextResponse.json({
        supportEmail: settings?.supportEmail ?? "support@linknsmile.com",
        supportPhone: settings?.supportPhone ?? "+91 8355991099",
        brandTagline: settings?.brandTagline ?? "Net & Work Builds Up Net-Worth",
        taxRatePercent: settings?.taxRatePercent ?? 0,
      })
    );
  } catch (error) {
    console.error("Error fetching public platform settings:", error);
    return withCORS(
      NextResponse.json({
        supportEmail: "support@linknsmile.com",
        supportPhone: "+91 8355991099",
        brandTagline: "Net & Work Builds Up Net-Worth",
        taxRatePercent: 0,
      })
    );
  }
}
