// app/api/vendor/storefront/route.ts
//
// PUT (multipart/form-data) — a vendor edits their own shop's public page:
//   description               text
//   logo, banner              image files (JPEG/PNG/WebP)
//   removeLogo, removeBanner  "true" to clear the image
// Every field is optional; one that is absent is left as it is. The shop is
// always the caller's own. Rules and storage: lib/shop-storefront.ts.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/vendor-guard";
import { apiError } from "@/lib/api-error";
import { readStorefrontForm, saveStorefront, type StorefrontFailure } from "@/lib/shop-storefront";

const failure = ({ code, message, status, field, reason }: StorefrontFailure) =>
  apiError(code, message, status, { message, field, reason });

export async function PUT(req: NextRequest) {
  try {
    // Same gate as /api/vendor/settings: the MOU only.
    const guard = await requireVendor(req);
    if (!guard.ok) return guard.response;

    const form = await readStorefrontForm(req);
    if (!form.ok) return failure(form);

    const result = await saveStorefront(guard.shopId, form.input);
    if (!result.ok) return failure(result);

    return withCORS(
      NextResponse.json({ success: true, message: "Store page updated", shop: result.shop })
    );
  } catch (error) {
    console.error("Update vendor storefront error:", error);
    return apiError("INTERNAL_ERROR", "Failed to update store page", 500, {
      message: "Failed to update store page",
    });
  }
}
