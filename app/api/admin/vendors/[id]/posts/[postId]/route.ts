// app/api/admin/vendors/[id]/posts/[postId]/route.ts
//
// PATCH (JSON) — an admin acts on one post of a shop:
//   { action: "unpublish", reason }  back to draft; the vendor may fix it and
//                                    publish again
//   { action: "remove", reason }     taken down for good; the vendor can only
//                                    delete it
// The reason is required and is shown to the vendor. Each action is written
// to AuditLog (SHOP_POST_UNPUBLISHED / SHOP_POST_REMOVED) together with the
// change. Rules: lib/shop-posts.ts.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { apiError, clientIp } from "@/lib/api-error";
import { moderateShopPost } from "@/lib/shop-posts";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiError("VALIDATION_ERROR", "Expected a JSON body", 400, {
        message: "Expected a JSON body",
      });
    }

    const result = await moderateShopPost(id, postId, body, {
      id: session.user.id,
      ip: clientIp(req),
    });
    if (!result.ok) {
      const { code, message, status, field, reason } = result;
      return apiError(code, message, status, { message, field, reason });
    }

    return withCORS(NextResponse.json({ success: true, post: result.post }));
  } catch (error) {
    console.error("Moderate shop post (admin) error:", error);
    return apiError("INTERNAL_ERROR", "Failed to update the post", 500, {
      message: "Failed to update the post",
    });
  }
}
