// app/api/vendor/posts/[id]/route.ts
//
// One of the caller's own posts (lib/shop-posts.ts).
//   PUT     (JSON) change it: { title?, text?, videoUrl?, status?, images? }.
//           status is "draft" or "published" (publish / unpublish). images is
//           the post's current pictures reordered and/or with some left out.
//           An absent field is left as it is.
//   DELETE  delete it, whatever its status.
// A post an admin removed can only be deleted.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/vendor-guard";
import { apiError } from "@/lib/api-error";
import { deleteShopPost, updateShopPost, type PostFailure } from "@/lib/shop-posts";

const failure = ({ code, message, status, field, reason }: PostFailure) =>
  apiError(code, message, status, { message, field, reason });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guard = await requireVendor(req, { subscription: true, approval: true });
    if (!guard.ok) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiError("VALIDATION_ERROR", "Expected a JSON body", 400, {
        message: "Expected a JSON body",
      });
    }

    const result = await updateShopPost(guard.shopId, id, body);
    if (!result.ok) return failure(result);

    return withCORS(NextResponse.json({ success: true, post: result.post }));
  } catch (error) {
    console.error("Update vendor post error:", error);
    return apiError("INTERNAL_ERROR", "Failed to save the post", 500, {
      message: "Failed to save the post",
    });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guard = await requireVendor(req, { subscription: true, approval: true });
    if (!guard.ok) return guard.response;

    const result = await deleteShopPost(guard.shopId, id);
    if (!result.ok) return failure(result);

    return withCORS(NextResponse.json({ success: true, message: "Post deleted" }));
  } catch (error) {
    console.error("Delete vendor post error:", error);
    return apiError("INTERNAL_ERROR", "Failed to delete the post", 500, {
      message: "Failed to delete the post",
    });
  }
}
