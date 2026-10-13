// lib/shop-page.ts
//
// Everything the public shop page (app/shop/[slug]) shows, loaded in one
// place: the shop, then its products and/or published posts depending on
// its store type (lib/shop-store-type.ts).

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

/** Newest posts shown; paging comes with the posts screen. */
const POSTS_ON_PAGE = 20;

export interface ShopPagePost {
  _id: string;
  title: string;
  text: string;
  images: string[];
  /** Already checked: an https:// address, or null. */
  videoUrl: string | null;
  createdAt: string;
}

export interface ShopPageData {
  shop: any;
  storeType: StoreType;
  /** Empty for a Services shop, whatever it has. */
  products: any[];
  /** Published posts, newest first. Empty for a Products shop. */
  posts: ShopPagePost[];
  sections: ShopPageSections;
}

export async function getShopPageData(slug: string): Promise<ShopPageData | null> {
  await connectDB();

  const shop = (await Shop.findOne({ slug, isActive: true, isApproved: true })
    .select(SHOP_PAGE_SELECT)
    .lean()) as any;
  if (!shop) return null;

  const storeType = storeTypeOf(shop);

  const [products, posts] = await Promise.all([
    storeType === "services"
      ? []
      : (Product.find({
          shopId: shop._id,
          isActive: true,
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
      ? []
      : (ShopPost.find({ shopId: shop._id, status: "published" })
          .select("title text images videoUrl createdAt")
          .sort({ createdAt: -1 })
          .limit(POSTS_ON_PAGE)
          .lean() as Promise<any[]>),
  ]);

  return {
    shop: JSON.parse(JSON.stringify(shop)),
    storeType,
    products: JSON.parse(JSON.stringify(products)),
    posts: posts.map((post) => ({
      _id: String(post._id),
      title: post.title,
      text: post.text ?? "",
      images: (post.images ?? []).slice(0, POST_MAX_IMAGES),
      videoUrl: safeVideoUrl(post.videoUrl),
      createdAt: new Date(post.createdAt).toISOString(),
    })),
    sections: shopPageSections(storeType, { products: products.length, posts: posts.length }),
  };
}
