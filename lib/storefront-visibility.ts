// lib/storefront-visibility.ts
//
// Which products the public site shows, and how a shop's products and posts
// come back after the subscription sweep hid them.

import { Product } from "@/lib/models/product";
import { ShopPost } from "@/lib/models/shop-post";

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
