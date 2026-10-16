// app/api/admin/services/nav/route.ts
//
// PUT (JSON) { enabled: boolean } — shows or hides the "Services" navbar
// link. While it is off, /services is "not found" for everyone but admins.
// Logged as SERVICES_NAV_SWITCHED.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { setServicesNavEnabled } from "@/lib/services-admin";
import { badBody, jsonBody, servicesAdmin, servicesError, servicesFailure } from "@/lib/services-admin-http";

export async function PUT(req: NextRequest) {
  try {
    const auth = await servicesAdmin(req);
    if (!auth.ok) return auth.response;
    const body = await jsonBody(req);
    if (!body) return badBody();
    const result = await setServicesNavEnabled(body, auth.admin);
    if (!result.ok) return servicesFailure(result);
    return withCORS(NextResponse.json({ success: true, navEnabled: result.navEnabled }));
  } catch (error) {
    return servicesError("switch the Services link", error);
  }
}
