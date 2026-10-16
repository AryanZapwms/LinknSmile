// lib/services-page.ts
//
// What the public /services page (app/services) shows, loaded in one place:
// the category filter, the featured vendors, the other vendors a page at a
// time, and the "Latest work" strip. The admin side is lib/services-admin.ts.
//
// A vendor is listed when its shop is approved and active, its store type is
// Services or Both, and its subscription has not been expired for more than
// 30 days (the moment its products and posts are hidden too). With a
// category chosen, only vendors of that category are listed.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { ShopPost } from "@/lib/models/shop-post";
import { ServiceCategory } from "@/lib/models/service-category";
import { PlatformSettings } from "@/lib/models/platform-settings";
import { shopsHiddenBySubscription } from "@/lib/storefront-visibility";
import { categoryName } from "@/lib/service-category-rules";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/** Vendors per page of the general list; "Load more" adds this many. */
export const SERVICES_PAGE_SIZE = 24;
/** Posts in "Latest work", and at most this many from one vendor. */
export const LATEST_WORK_COUNT = 8;
export const LATEST_WORK_PER_VENDOR = 2;

export interface ServicesCategory {
  _id: string;
  slug: string;
  /** In the reader's language, or English. */
  name: string;
}

export interface ServicesVendorCard {
  _id: string;
  shopName: string;
  slug: string;
  logo: string | null;
  city: string | null;
  category: ServicesCategory | null;
  /** The first picture of the vendor's newest post that has one. */
  picture: string | null;
}

export interface ServicesLatestWork {
  _id: string;
  title: string;
  picture: string;
  shopName: string;
  shopSlug: string;
}

export interface ServicesVendorsPage {
  vendors: ServicesVendorCard[];
  /** The page to ask for next; null when there is none. */
  nextPage: number | null;
}

export interface ServicesPageData extends ServicesVendorsPage {
  categories: ServicesCategory[];
  /** The category filtered by, or null for all. */
  activeCategory: ServicesCategory | null;
  featured: ServicesVendorCard[];
  latestWork: ServicesLatestWork[];
}

// Published only (never a draft or a post an admin removed), and not while
// the subscription sweep has it hidden; with a picture.
const shownPostsWithPicture = (shopIds: unknown[]) => ({
  shopId: { $in: shopIds },
  status: "published",
  hiddenBySubscription: { $ne: true },
  "images.0": { $exists: true },
});

async function loadCategories(locale: string): Promise<{ list: ServicesCategory[]; byId: Map<string, ServicesCategory> }> {
  const docs = await ServiceCategory.find().sort({ sortOrder: 1, createdAt: 1 }).select("name slug").lean();
  const list = docs.map((c) => ({ _id: String(c._id), slug: c.slug, name: categoryName(c.name, locale) }));
  return { list, byId: new Map(list.map((c) => [c._id, c])) };
}

/**
 * Every listed vendor (in the category, if one is given), featured first in
 * the admin's order, the rest with the newest post first and then by name.
 */
async function orderedVendors(categoryId: string | null, byCategory: Map<string, ServicesCategory>, now: Date) {
  const shops = await Shop.find({
    isApproved: true,
    isActive: true,
    storeType: { $in: ["services", "both"] },
    ...(categoryId ? { serviceCategory: new mongoose.Types.ObjectId(categoryId) } : {}),
  })
    .select("shopName slug logo address.city serviceCategory")
    .lean<any[]>();
  const hidden = await shopsHiddenBySubscription(
    shops.map((s) => s._id),
    now
  );
  const listed = shops.filter((s) => !hidden.has(String(s._id)));
  const ids = listed.map((s) => s._id);

  const [latest, pictures, settings] = await Promise.all([
    // The date of each vendor's newest shown post, picture or not.
    ShopPost.aggregate<{ _id: mongoose.Types.ObjectId; at: Date }>([
      { $match: { shopId: { $in: ids }, status: "published", hiddenBySubscription: { $ne: true } } },
      { $group: { _id: "$shopId", at: { $max: "$createdAt" } } },
    ]),
    // The first picture of each vendor's newest shown post that has one.
    ShopPost.aggregate<{ _id: mongoose.Types.ObjectId; picture: string }>([
      { $match: shownPostsWithPicture(ids) },
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: "$shopId", picture: { $first: { $arrayElemAt: ["$images", 0] } } } },
    ]),
    PlatformSettings.findOne().select("servicesFeaturedShops").lean<{ servicesFeaturedShops?: unknown[] }>(),
  ]);
  const latestAt = new Map(latest.map((l) => [String(l._id), new Date(l.at).getTime()]));
  const pictureOf = new Map(pictures.map((p) => [String(p._id), p.picture]));

  const toCard = (shop: any): ServicesVendorCard => ({
    _id: String(shop._id),
    shopName: shop.shopName,
    slug: shop.slug,
    logo: shop.logo ?? null,
    city: shop.address?.city ?? null,
    category: shop.serviceCategory ? (byCategory.get(String(shop.serviceCategory)) ?? null) : null,
    picture: pictureOf.get(String(shop._id)) ?? null,
  });

  const byId = new Map(listed.map((s) => [String(s._id), s]));
  const featuredIds = (settings?.servicesFeaturedShops ?? []).map(String);
  const featured = featuredIds.filter((id) => byId.has(id)).map((id) => toCard(byId.get(id)));
  const rest = listed
    .filter((s) => !featuredIds.includes(String(s._id)))
    .sort(
      (a, b) =>
        (latestAt.get(String(b._id)) ?? -Infinity) - (latestAt.get(String(a._id)) ?? -Infinity) ||
        String(a.shopName).localeCompare(String(b.shopName))
    )
    .map(toCard);
  return { listed, featured, rest };
}

function pageOf(rest: ServicesVendorCard[], page: number): ServicesVendorsPage {
  const start = (page - 1) * SERVICES_PAGE_SIZE;
  return {
    vendors: rest.slice(start, start + SERVICES_PAGE_SIZE),
    nextPage: rest.length > start + SERVICES_PAGE_SIZE ? page + 1 : null,
  };
}

/** Everything the page shows. An unknown category slug shows all vendors. */
export async function getServicesPageData(options: {
  categorySlug?: string | null;
  locale: string;
  now?: Date;
}): Promise<ServicesPageData> {
  await connectDB();
  const now = options.now ?? new Date();
  const { list: categories, byId } = await loadCategories(options.locale);
  const activeCategory = categories.find((c) => c.slug === options.categorySlug) ?? null;
  const { listed, featured, rest } = await orderedVendors(activeCategory?._id ?? null, byId, now);

  // Newest first, at most LATEST_WORK_PER_VENDOR from each vendor so no one
  // vendor fills the strip: each vendor's newest few, then the newest of those.
  const shopById = new Map(listed.map((s) => [String(s._id), s]));
  const newest = await ShopPost.aggregate<{ _id: mongoose.Types.ObjectId; shopId: mongoose.Types.ObjectId; title: string; picture: string }>([
    { $match: shownPostsWithPicture(listed.map((s) => s._id)) },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: "$shopId",
        posts: { $push: { _id: "$_id", title: "$title", picture: { $arrayElemAt: ["$images", 0] }, createdAt: "$createdAt" } },
      },
    },
    { $project: { posts: { $slice: ["$posts", LATEST_WORK_PER_VENDOR] } } },
    { $unwind: "$posts" },
    { $replaceRoot: { newRoot: { $mergeObjects: ["$posts", { shopId: "$_id" }] } } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: LATEST_WORK_COUNT },
  ]);
  const latestWork: ServicesLatestWork[] = [];
  for (const post of newest) {
    const shop = shopById.get(String(post.shopId));
    if (!shop) continue;
    latestWork.push({ _id: String(post._id), title: post.title, picture: post.picture, shopName: shop.shopName, shopSlug: shop.slug });
  }

  return { categories, activeCategory, featured, latestWork, ...pageOf(rest, 1) };
}

/** A later page of the general list ("Load more"), in the same order as the page. */
export async function getServicesVendorsPage(options: {
  categorySlug?: string | null;
  page: number;
  locale: string;
  now?: Date;
}): Promise<ServicesVendorsPage> {
  await connectDB();
  const { list: categories, byId } = await loadCategories(options.locale);
  const activeCategory = categories.find((c) => c.slug === options.categorySlug) ?? null;
  const { rest } = await orderedVendors(activeCategory?._id ?? null, byId, options.now ?? new Date());
  return pageOf(rest, options.page);
}

/**
 * Whether the reader may see /services: everyone once an admin has switched
 * it on; while it is off, only admins, who see it as a preview.
 */
export async function servicesPageAccess(): Promise<{ visible: boolean; preview: boolean }> {
  await connectDB();
  const settings = await PlatformSettings.findOne()
    .select("servicesNavEnabled")
    .lean<{ servicesNavEnabled?: boolean }>();
  if (settings?.servicesNavEnabled) return { visible: true, preview: false };
  const session = await getServerSession(authOptions);
  const admin = session?.user?.role === "admin";
  return { visible: admin, preview: admin };
}
