// lib/subscription-mobile.ts
//
// App Store guideline 3.1.1: the mobile app must not start or complete a
// vendor subscription purchase. Mobile (Bearer) callers of the subscription
// payment endpoints get the current status only; renewal happens on the
// website. Web (cookie session) callers are unaffected.

import { apiError } from "@/lib/api-error";
import { getShopSubscriptionAccessState } from "@/lib/vendor-subscription-status";
import type { AuthUser } from "@/lib/get-auth-user";

export async function blockMobileSubscriptionPayment(user: AuthUser) {
  if (user.via !== "bearer") return null;
  const access = user.shopId ? await getShopSubscriptionAccessState(user.shopId) : null;
  return apiError(
    "PAYMENT_NOT_AVAILABLE_ON_MOBILE",
    "Subscription renewal is not available in the app.",
    403,
    {
      subscription: access && {
        status: access.status,
        daysUntilExpiry: access.daysUntilExpiry,
        isInGracePeriod: access.isInGracePeriod,
        isBlocked: access.isBlocked,
      },
    }
  );
}
