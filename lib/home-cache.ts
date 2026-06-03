import { invalidateCache } from "@/lib/cacheClient";

const SUGGESTED_PRODUCTS_KEY = "home:products:suggested:8";
const ALL_PRODUCTS_KEY = "home:products:all:100";
const REVIEWS_KEY = "home:reviews:all";

export function invalidateHomeCaches() {
  invalidateCache(SUGGESTED_PRODUCTS_KEY);
  invalidateCache(ALL_PRODUCTS_KEY);
  invalidateCache(REVIEWS_KEY);
}
