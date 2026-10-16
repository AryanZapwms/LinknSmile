// app/api/admin/services/featured/route.ts
//
// PUT (JSON) { shopIds: string[] } — the featured vendors of /services, in
// display order. The whole list each time: adding, removing and reordering
// are all this one call. Logged as SERVICES_FEATURED_UPDATED.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { setFeaturedShops } from "@/lib/services-admin";
import { badBody, jsonBody, servicesAdmin, servicesError, servicesFailure } from "@/lib/services-admin-http";

export async function PUT(req: NextRequest) {
  try {
    const auth = await servicesAdmin(req);
    if (!auth.ok) return auth.response;
    const body = await jsonBody(req);
    if (!body) return badBody();
    const result = await setFeaturedShops(body, auth.admin);
    if (!result.ok) return servicesFailure(result);
    return withCORS(NextResponse.json({ success: true, featured: result.featured }));
  } catch (error) {
    return servicesError("save the featured vendors", error);
  }
}
