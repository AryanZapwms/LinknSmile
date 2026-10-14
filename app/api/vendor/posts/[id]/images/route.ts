// app/api/vendor/posts/[id]/images/route.ts
//
// POST (multipart/form-data) — adds one picture to one of the caller's own
// posts: a file in the field "image" (JPEG/PNG/WebP judged by content, up to
// 5 MB; a post holds up to 10). One picture per request, so a post with ten
// pictures never needs an upload bigger than the server accepts. Removing or
// reordering pictures is a PUT on the post itself. Rules and storage:
// lib/shop-posts.ts.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/vendor-guard";
import { apiError } from "@/lib/api-error";
import { addShopPostImage, readPostImageForm, type PostFailure } from "@/lib/shop-posts";

const failure = ({ code, message, status, field, reason }: PostFailure) =>
  apiError(code, message, status, { message, field, reason });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guard = await requireVendor(req, { subscription: true, approval: true });
    if (!guard.ok) return guard.response;

    const form = await readPostImageForm(req);
    if (!form.ok) return failure(form);

    const result = await addShopPostImage(guard.shopId, id, form.file);
    if (!result.ok) return failure(result);

    return withCORS(NextResponse.json({ success: true, post: result.post }, { status: 201 }));
  } catch (error) {
    console.error("Add vendor post picture error:", error);
    return apiError("INTERNAL_ERROR", "Failed to add the picture", 500, {
      message: "Failed to add the picture",
    });
  }
}
