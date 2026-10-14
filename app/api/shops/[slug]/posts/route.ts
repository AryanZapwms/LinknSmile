// app/api/shops/[slug]/posts/route.ts
//
// GET — published posts of a public shop page, for the posts grid on
// /shop/[slug] (components/shop/shop-posts-grid.tsx). Public, read-only.
//   ?cursor=<nextCursor of the previous page>  the next page (12 posts)
//   ?post=<id>                                 one post, for a shared ?post= link
//                                              to a post not on the first page
// Only what the page itself would show: a public shop whose store type shows
// posts, and its published posts that are not hidden. Anything else is a 404.
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { decodeCursor, getShopPagePost, getShopPagePosts } from "@/lib/shop-page";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);

    const postId = searchParams.get("post");
    if (postId !== null) {
      const post = await getShopPagePost(slug, postId);
      if (!post) return apiError("NOT_FOUND", "Post not found", 404);
      return withCORS(NextResponse.json({ post }));
    }

    const cursorParam = searchParams.get("cursor");
    const cursor = cursorParam === null ? null : decodeCursor(cursorParam);
    if (cursorParam !== null && !cursor) {
      return apiError("VALIDATION_ERROR", "Invalid cursor", 400);
    }

    const page = await getShopPagePosts(slug, cursor);
    if (!page) return apiError("NOT_FOUND", "Shop not found", 404);
    return withCORS(NextResponse.json(page));
  } catch (error) {
    console.error("Shop page posts error:", error);
    return apiError("INTERNAL_ERROR", "Failed to load posts", 500);
  }
}
