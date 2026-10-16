// app/api/admin/services/categories/starting/route.ts
//
// POST — adds the starting categories (lib/service-category-rules.ts) to an
// empty list; refused once any category exists. Each country's database
// needs this once. Logged as SERVICE_CATEGORIES_STARTING_ADDED.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { addStartingServiceCategories } from "@/lib/services-admin";
import { servicesAdmin, servicesError, servicesFailure } from "@/lib/services-admin-http";

export async function POST(req: NextRequest) {
  try {
    const auth = await servicesAdmin(req);
    if (!auth.ok) return auth.response;
    const result = await addStartingServiceCategories(auth.admin);
    if (!result.ok) return servicesFailure(result);
    return withCORS(NextResponse.json({ success: true, categories: result.categories }, { status: 201 }));
  } catch (error) {
    return servicesError("add the starting categories", error);
  }
}
