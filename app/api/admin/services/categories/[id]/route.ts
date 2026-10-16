// app/api/admin/services/categories/[id]/route.ts
//
// PUT    (JSON) { name: { en, ar?, hi? } } — renames a category; its slug
//        (and so its /services?category= link) stays. Logged as
//        SERVICE_CATEGORY_RENAMED.
// DELETE — removes it; the shops that had it are left without a category.
//        Logged as SERVICE_CATEGORY_REMOVED with how many shops that was.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { removeServiceCategory, renameServiceCategory } from "@/lib/services-admin";
import { badBody, jsonBody, servicesAdmin, servicesError, servicesFailure } from "@/lib/services-admin-http";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await servicesAdmin(req);
    if (!auth.ok) return auth.response;
    const body = await jsonBody(req);
    if (!body) return badBody();
    const result = await renameServiceCategory(id, body, auth.admin);
    if (!result.ok) return servicesFailure(result);
    return withCORS(NextResponse.json({ success: true, category: result.category }));
  } catch (error) {
    return servicesError("rename the category", error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await servicesAdmin(req);
    if (!auth.ok) return auth.response;
    const result = await removeServiceCategory(id, auth.admin);
    if (!result.ok) return servicesFailure(result);
    return withCORS(NextResponse.json({ success: true, vendorsAffected: result.vendorsAffected }));
  } catch (error) {
    return servicesError("remove the category", error);
  }
}
