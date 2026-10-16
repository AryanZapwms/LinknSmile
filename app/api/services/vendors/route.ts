// app/api/services/vendors/route.ts
//
// GET ?page=<n>&category=<slug> — a later page of the general vendor list on
// /services ("Load more"), in the same order as the page itself
// (lib/services-page.ts). Public and read-only, but only while the Services
// page is switched on; an admin can use it while previewing.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { resolveLocaleFromCookieValue } from "@/lib/i18n-config";
import { getServicesVendorsPage, servicesPageAccess } from "@/lib/services-page";

export async function GET(req: NextRequest) {
  try {
    if (!(await servicesPageAccess()).visible) {
      return apiError("NOT_FOUND", "Not found", 404);
    }
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1");
    if (!Number.isInteger(page) || page < 1 || page > 1000) {
      return apiError("VALIDATION_ERROR", "page must be a whole number from 1", 400);
    }
    const result = await getServicesVendorsPage({
      categorySlug: searchParams.get("category"),
      page,
      locale: resolveLocaleFromCookieValue(req.cookies.get("NEXT_LOCALE")?.value),
    });
    return withCORS(NextResponse.json(result));
  } catch (error) {
    console.error("Services vendors page error:", error);
    return apiError("INTERNAL_ERROR", "Failed to load vendors", 500);
  }
}
