// lib/storefront-visibility.ts
//
// Which products the public site shows, which shops are hidden for an
// expired subscription, and how a shop's products and posts come back after
// the subscription sweep hid them.

import { Product } from "@/lib/models/product";
import { ShopPost } from "@/lib/models/shop-post";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { getSubscriptionAccessState, type SubscriptionLike } from "@/lib/vendor-subscription-status";

/**
 * The products a customer can see and open: switched on, approved (or
 * saved before approval existed), and not hidden by the subscription sweep.
 * The same rule as the catalogue (app/api/products) and the shop page
 * (lib/shop-page.ts). A new object each call, because Mongoose may change a
 * filter it is given. It contains an $or, so spread it only into a query
 * that has none of its own.
 */
export function shownProductFilter() {
  return {
    isActive: true,
    hiddenBySubscription: { $ne: true },
    $or: [
      { approvalStatus: "approved" },
      { approvalStatus: { $exists: false } },
      { approvalStatus: null },
    ],
  };
}

/**
 * Shows a shop's products and posts again after the subscription sweep hid
 * them (more than 30 days expired). Called whenever the subscription becomes
 * active again: a paid renewal (lib/subscription-fulfillment.ts), or an admin
 * granting free access or extending it
 * (app/api/admin/vendor-subscriptions/[shopId]). Safe to call when nothing
 * is hidden. Returns how many of each it brought back.
 */
export async function showHiddenStorefront(
  shopId: unknown
): Promise<{ products: number; posts: number }> {
  const [products, posts] = await Promise.all([
    Product.updateMany({ shopId, hiddenBySubscription: true }, { hiddenBySubscription: false }),
    ShopPost.updateMany({ shopId, hiddenBySubscription: true }, { hiddenBySubscription: false }),
  ]);
  return { products: products.modifiedCount, posts: posts.modifiedCount };
}

/**
 * Of the given shops, the ones whose storefront is hidden for an expired
 * subscription: blocked, and more than 30 days past expiry. The same moment
 * the subscription sweep hides their products and posts. A shop with no
 * subscription record is not hidden, just as the sweep never hides its
 * products. Returns shop ids as strings.
 */
export async function shopsHiddenBySubscription(
  shopIds: unknown[],
  now: Date = new Date()
): Promise<Set<string>> {
  if (shopIds.length === 0) return new Set();
  const subs = await VendorSubscription.find({ shopId: { $in: shopIds } })
    .select("shopId status expiryDate")
    .lean<(SubscriptionLike & { shopId: unknown })[]>();
  const hidden = new Set<string>();
  for (const sub of subs) {
    const access = getSubscriptionAccessState(sub, now);
    if (access.isBlocked && access.storefrontHideDate && now > access.storefrontHideDate) {
      hidden.add(String(sub.shopId));
    }
  }
  return hidden;
}
