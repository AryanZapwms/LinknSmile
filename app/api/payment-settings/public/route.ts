// app/api/payment-settings/public/route.ts
// Public payment options { enableCOD, enableRazorpay } — the path the web
// checkout (app/checkout/page.tsx) has always requested. It used to exist
// only under /api/admin/payment-settings/public, so checkout got a 404 from
// the file-serving catch-all and fell back to "everything enabled",
// ignoring the admin's settings. Same handler as the admin path.

import type { NextRequest } from "next/server";
import { GET as publicPaymentSettings } from "@/app/api/admin/payment-settings/public/route";

export async function GET(request: NextRequest) {
  return publicPaymentSettings(request);
}
