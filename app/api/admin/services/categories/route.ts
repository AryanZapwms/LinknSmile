// app/api/admin/services/categories/route.ts
//
// POST (JSON) { name: { en, ar?, hi? } } — adds a service category at the
//   end of the list. Logged as SERVICE_CATEGORY_CREATED.
// PUT  (JSON) { order: string[] } — the display order; every category id
//   exactly once. Logged as SERVICE_CATEGORIES_REORDERED.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { createServiceCategory, reorderServiceCategories } from "@/lib/services-admin";
import { badBody, jsonBody, servicesAdmin, servicesError, servicesFailure } from "@/lib/services-admin-http";

export async function POST(req: NextRequest) {
  try {
    const auth = await servicesAdmin(req);
    if (!auth.ok) return auth.response;
    const body = await jsonBody(req);
    if (!body) return badBody();
    const result = await createServiceCategory(body, auth.admin);
    if (!result.ok) return servicesFailure(result);
    return withCORS(NextResponse.json({ success: true, category: result.category }, { status: 201 }));
  } catch (error) {
    return servicesError("add the category", error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await servicesAdmin(req);
    if (!auth.ok) return auth.response;
    const body = await jsonBody(req);
    if (!body) return badBody();
    const result = await reorderServiceCategories(body, auth.admin);
    if (!result.ok) return servicesFailure(result);
    return withCORS(NextResponse.json({ success: true, order: result.order }));
  } catch (error) {
    return servicesError("reorder the categories", error);
  }
}
