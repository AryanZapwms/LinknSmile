// app/api/admin/services/route.ts
//
// GET — everything /admin/services shows: the navbar switch, the service
// categories (with how many shops use each), the featured vendors (with why
// one is not shown, if so) and the shops that can be featured.
// Changes go through ./nav, ./featured and ./categories. Logic:
// lib/services-admin.ts.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServicesOverview } from "@/lib/services-admin";
import { servicesAdmin, servicesError } from "@/lib/services-admin-http";

export async function GET(req: NextRequest) {
  try {
    const auth = await servicesAdmin(req);
    if (!auth.ok) return auth.response;
    return withCORS(NextResponse.json({ success: true, ...(await getServicesOverview()) }));
  } catch (error) {
    return servicesError("load the services settings", error);
  }
}
