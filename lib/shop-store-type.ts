// lib/shop-store-type.ts
//
// What a shop offers — products, services, or both — and which sections its
// public page (app/shop/[slug]) shows as a result. Imported by the browser
// form (components/shop/storefront-editor.tsx) and by the server, so
// nothing server-only may be imported here.

export const STORE_TYPES = ["products", "services", "both"] as const;
export type StoreType = (typeof STORE_TYPES)[number];

export function isStoreType(value: unknown): value is StoreType {
  return typeof value === "string" && (STORE_TYPES as readonly string[]).includes(value);
}

/**
 * A shop's store type. Shops created before store types existed have none
 * saved; they sell products, so that is what they are read as. Nothing is
 * backfilled.
 */
export function storeTypeOf(shop: { storeType?: unknown } | null | undefined): StoreType {
  const value = shop?.storeType;
  return isStoreType(value) ? value : "products";
}

export interface ShopPageSections {
  products: boolean;
  posts: boolean;
  /** Neither section has anything in it: one friendly message is shown instead. */
  nothingYet: boolean;
}

/** Which sections the public shop page shows, given what the shop has. */
export function shopPageSections(
  storeType: StoreType,
  counts: { products: number; posts: number }
): ShopPageSections {
  // A Products shop looks exactly as it did before store types existed: the
  // products section is always there and has its own empty state.
  if (storeType === "products") return { products: true, posts: false, nothingYet: false };

  // Services never shows products, even if the shop has some. Both hides
  // whichever side is empty.
  const products = storeType === "both" && counts.products > 0;
  const posts = counts.posts > 0;
  return { products, posts, nothingYet: !products && !posts };
}
