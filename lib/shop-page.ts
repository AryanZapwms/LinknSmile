// lib/shop-page.ts
//
// Everything the public shop page (app/shop/[slug]) shows, loaded in one
// place: the shop, then its products and/or published posts depending on
// its store type (lib/shop-store-type.ts). Posts come a page at a time: the
// page renders the first one, and the grid (components/shop/shop-posts-grid.tsx)
// asks app/api/shops/[slug]/posts for the next ones and for a single post
// opened from a shared ?post= link.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { Product } from "@/lib/models/product";
import { ShopPost } from "@/lib/models/shop-post";
import { POST_MAX_IMAGES, safeVideoUrl } from "@/lib/shop-post-rules";
import {
  shopPageSections,
  storeTypeOf,
  type ShopPageSections,
  type StoreType,
} from "@/lib/shop-store-type";

// Only what the page displays — never bank details or business documents.
const SHOP_PAGE_SELECT =
  "shopName slug storeType description logo coverImage address contactInfo isApproved ratings";

/** Posts per page of the posts grid: the page shows this many, "Load more" adds this many. */
export const POSTS_PAGE_SIZE = 12;

const POST_SELECT = "title text images videoUrl createdAt";

export interface ShopPagePost {
  _id: string;
  title: string;
  text: string;
  images: string[];
  /** Already checked: an https:// YouTube or Vimeo address, or null. */
  videoUrl: string | null;
  createdAt: string;
}

export interface ShopPagePostsPage {
  /** Newest first. */
  posts: ShopPagePost[];
  /** Asks for the page after this one; null when there is none. */
  nextCursor: string | null;
}

export interface ShopPageData {
  shop: any;
  storeType: StoreType;
  /** Empty for a Services shop, whatever it has. */
  products: any[];
  /** The first page of published posts, newest first. Empty for a Products shop. */
  posts: ShopPagePost[];
  /** For the next page of posts; null when there is none. */
  nextPostsCursor: string | null;
  sections: ShopPageSections;
}

// Published only (never a draft or a post an admin removed), and not while
// the subscription sweep has the storefront hidden.
const shownPosts = (shopId: unknown) => ({
  shopId,
  status: "published",
  hiddenBySubscription: { $ne: true },
});

function toPagePost(post: any): ShopPagePost {
  return {
    _id: String(post._id),
    title: post.title,
    text: post.text ?? "",
    images: (post.images ?? []).slice(0, POST_MAX_IMAGES),
    videoUrl: safeVideoUrl(post.videoUrl),
    createdAt: new Date(post.createdAt).toISOString(),
  };
}

// A cursor is the last post shown, as "<createdAt ISO>_<id>": the next page
// starts right after it. The id breaks ties between posts with the same date.
const encodeCursor = (post: ShopPagePost) => `${post.createdAt}_${post._id}`;

/** The cursor's parts, or null when it is not one this module made. */
export function decodeCursor(cursor: string): { at: Date; id: mongoose.Types.ObjectId } | null {
  const [iso, id, extra] = cursor.split("_");
  const at = new Date(iso);
  if (extra !== undefined || Number.isNaN(at.getTime()) || !mongoose.isValidObjectId(id)) {
    return null;
  }
  return { at, id: new mongoose.Types.ObjectId(id) };
}

async function findPostsPage(
  shopId: unknown,
  after: { at: Date; id: mongoose.Types.ObjectId } | null
): Promise<ShopPagePostsPage> {
  const filter: Record<string, unknown> = shownPosts(shopId);
  if (after) {
    filter.$or = [{ createdAt: { $lt: after.at } }, { createdAt: after.at, _id: { $lt: after.id } }];
  }
  // One more than a page, to know whether there is a next one.
  const docs = await ShopPost.find(filter)
    .select(POST_SELECT)
    .sort({ createdAt: -1, _id: -1 })
    .limit(POSTS_PAGE_SIZE + 1)
    .lean();
  const posts = docs.slice(0, POSTS_PAGE_SIZE).map(toPagePost);
  return {
    posts,
    nextCursor: docs.length > POSTS_PAGE_SIZE ? encodeCursor(posts[posts.length - 1]) : null,
  };
}

/** The shop behind a public page, when that page exists and shows posts. */
async function findPostsShop(slug: string) {
  await connectDB();
  const shop = await Shop.findOne({ slug, isActive: true, isApproved: true })
    .select("storeType")
    .lean<{ _id: unknown; storeType?: string }>();
  return shop && storeTypeOf(shop) !== "products" ? shop : null;
}

/**
 * A page of a shop's posts after the given cursor (or the first page). null
 * when the shop's page is not public or does not show posts.
 */
export async function getShopPagePosts(
  slug: string,
  cursor: { at: Date; id: mongoose.Types.ObjectId } | null
): Promise<ShopPagePostsPage | null> {
  const shop = await findPostsShop(slug);
  return shop ? findPostsPage(shop._id, cursor) : null;
}

/** One post as the shop page shows it, or null when the page would not show it. */
export async function getShopPagePost(slug: string, postId: string): Promise<ShopPagePost | null> {
  if (!mongoose.isValidObjectId(postId)) return null;
  const shop = await findPostsShop(slug);
  if (!shop) return null;
  const post = await ShopPost.findOne({ _id: postId, ...shownPosts(shop._id) })
    .select(POST_SELECT)
    .lean();
  return post ? toPagePost(post) : null;
}

export async function getShopPageData(slug: string): Promise<ShopPageData | null> {
  await connectDB();

  const shop = (await Shop.findOne({ slug, isActive: true, isApproved: true })
    .select(SHOP_PAGE_SELECT)
    .lean()) as any;
  if (!shop) return null;

  const storeType = storeTypeOf(shop);

  const [products, postsPage] = await Promise.all([
    storeType === "services"
      ? []
      : (Product.find({
          shopId: shop._id,
          isActive: true,
          // Hidden by the subscription sweep (expired more than 30 days):
          // the catalogue, product page, cart and checkout already leave
          // these out, so the shop page must too.
          hiddenBySubscription: { $ne: true },
          $or: [
            { approvalStatus: "approved" },
            { approvalStatus: { $exists: false } },
            { approvalStatus: null },
          ],
        })
          .populate("category", "name slug")
          .select("name slug price discountPrice image images stock category origin")
          .sort({ createdAt: -1 })
          .lean() as Promise<any[]>),
    storeType === "products"
      ? ({ posts: [], nextCursor: null } as ShopPagePostsPage)
      : findPostsPage(shop._id, null),
  ]);

  return {
    shop: JSON.parse(JSON.stringify(shop)),
    storeType,
    products: JSON.parse(JSON.stringify(products)),
    posts: postsPage.posts,
    nextPostsCursor: postsPage.nextCursor,
    sections: shopPageSections(storeType, {
      products: products.length,
      posts: postsPage.posts.length,
    }),
  };
}
