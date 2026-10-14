// app/api/vendor/posts/route.ts
//
// A vendor's posts for their public shop page (lib/shop-posts.ts).
//   GET   every post of the caller's own shop, whatever its status
//   POST  (JSON) create one: { title, text?, videoUrl?, status? }
// Pictures are added afterwards, one request each
// (app/api/vendor/posts/[id]/images). The shop is always the caller's own.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import Shop from "@/lib/models/shop";
import { requireVendor } from "@/lib/vendor-guard";
import { apiError } from "@/lib/api-error";
import { storeTypeOf } from "@/lib/shop-store-type";
import { createShopPost, listShopPosts, type PostFailure } from "@/lib/shop-posts";

const failure = ({ code, message, status, field, reason }: PostFailure) =>
  apiError(code, message, status, { message, field, reason });

export async function GET(req: NextRequest) {
  try {
    // Same gate as products: an approved shop with an active subscription.
    const guard = await requireVendor(req, { subscription: true, approval: true });
    if (!guard.ok) return guard.response;

    const [posts, shop] = await Promise.all([
      listShopPosts(guard.shopId),
      Shop.findById(guard.shopId).select("storeType slug").lean<{ storeType?: string; slug?: string }>(),
    ]);

    // The store type decides whether the public page shows posts at all; the
    // screen says so when it does not.
    return withCORS(
      NextResponse.json({
        success: true,
        posts,
        storeType: storeTypeOf(shop),
        shopSlug: shop?.slug ?? null,
      })
    );
  } catch (error) {
    console.error("List vendor posts error:", error);
    return apiError("INTERNAL_ERROR", "Failed to load posts", 500, {
      message: "Failed to load posts",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireVendor(req, { subscription: true, approval: true });
    if (!guard.ok) return guard.response;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiError("VALIDATION_ERROR", "Expected a JSON body", 400, {
        message: "Expected a JSON body",
      });
    }

    const result = await createShopPost(guard.shopId, body);
    if (!result.ok) return failure(result);

    return withCORS(NextResponse.json({ success: true, post: result.post }, { status: 201 }));
  } catch (error) {
    console.error("Create vendor post error:", error);
    return apiError("INTERNAL_ERROR", "Failed to save the post", 500, {
      message: "Failed to save the post",
    });
  }
}
