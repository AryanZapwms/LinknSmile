// lib/vendor-subscription-status.ts
//
// Single source of truth for translating a VendorSubscription doc into an
// access decision. Used by the vendor layout (banner/hard-block), the
// gated app/api/vendor/* routes, and the storefront-visibility cron —
// keep all three in sync by only changing this file.

const GRACE_PERIOD_DAYS = 7;
const STOREFRONT_HIDE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type SubscriptionAccessStatus = "no_subscription" | "active" | "grace_period" | "blocked";

export interface SubscriptionLike {
  status: "active" | "expired" | "cancelled" | "pending";
  expiryDate?: Date | string | null;
}

export interface SubscriptionAccessState {
  status: SubscriptionAccessStatus;
  daysUntilExpiry: number | null; // negative once past expiry; null if no expiryDate
  isInGracePeriod: boolean;
  isBlocked: boolean;
  storefrontHideDate: Date | null; // expiryDate + 30 days
}

/**
 * DB-aware convenience wrapper for API routes: looks up the shop's
 * VendorSubscription and returns the same access state the vendor layout
 * and cron compute. Import from `@/lib/vendor-subscription-status` in any
 * gated `app/api/vendor/*` route — do not re-implement the expiry math
 * inline, keep it here so the 7-day-grace / 30-day-hide rules only live
 * in one place.
 */
export async function getShopSubscriptionAccessState(
  shopId: string
): Promise<SubscriptionAccessState> {
  const { connectDB } = await import("@/lib/db");
  const { VendorSubscription } = await import("@/lib/models/vendor-subscription");
  await connectDB();
  const sub = await VendorSubscription.findOne({ shopId }).lean<SubscriptionLike | null>();
  return getSubscriptionAccessState(sub);
}

export function getSubscriptionAccessState(
  sub: SubscriptionLike | null | undefined,
  now: Date = new Date()
): SubscriptionAccessState {
  if (!sub || !sub.expiryDate || sub.status === "pending") {
    return {
      status: "no_subscription",
      daysUntilExpiry: null,
      isInGracePeriod: false,
      isBlocked: true,
      storefrontHideDate: null,
    };
  }

  const expiryDate = new Date(sub.expiryDate);
  const storefrontHideDate = new Date(expiryDate.getTime() + STOREFRONT_HIDE_DAYS * MS_PER_DAY);
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / MS_PER_DAY);

  // Admin cancellation skips the grace period entirely, regardless of
  // how much time was left on the clock.
  if (sub.status === "cancelled") {
    return {
      status: "blocked",
      daysUntilExpiry,
      isInGracePeriod: false,
      isBlocked: true,
      storefrontHideDate,
    };
  }

  if (now <= expiryDate) {
    return {
      status: "active",
      daysUntilExpiry,
      isInGracePeriod: false,
      isBlocked: false,
      storefrontHideDate,
    };
  }

  const daysPastExpiry = -daysUntilExpiry;
  if (daysPastExpiry <= GRACE_PERIOD_DAYS) {
    return {
      status: "grace_period",
      daysUntilExpiry,
      isInGracePeriod: true,
      isBlocked: false,
      storefrontHideDate,
    };
  }

  return {
    status: "blocked",
    daysUntilExpiry,
    isInGracePeriod: false,
    isBlocked: true,
    storefrontHideDate,
  };
}
