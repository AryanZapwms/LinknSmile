// lib/vendor-guard.ts
//
// Server-side enforcement of the vendor gates, so API clients (the mobile
// app, curl) get the same rules as the web vendor area. Checked in order:
//   1. MOU_REQUIRED          — current MOU version not accepted (always)
//   2. SUBSCRIPTION_EXPIRED  — no subscription, cancelled, or >7 days past
//                              expiry (lib/vendor-subscription-status.ts);
//                              only with { subscription: true }
//   3. SHOP_PENDING          — shop not approved; only with { approval: true }
// Selling features — orders, products, coupons, reviews — use both options.
// Money the vendor already earned stays reachable with an expired
// subscription: wallet, ledger, payouts, bank details (and settings, stats)
// check the MOU only.
// Routes a blocked vendor needs to get unblocked — /api/vendor/status,
// /api/vendor/mou, /api/vendor/subscription/*, /api/vendor/exit — do not
// call this guard.
//
// Usage at the top of a handler:
//   const guard = await requireVendor(req, { subscription: true, approval: true });
//   if (!guard.ok) return guard.response;

import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { VendorMouAcceptance } from "@/lib/models/vendor-mou-acceptance";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { CURRENT_MOU_VERSION } from "@/lib/mou-content";
import {
  getSubscriptionAccessState,
  type SubscriptionAccessState,
  type SubscriptionLike,
} from "@/lib/vendor-subscription-status";
import { getAuthUser, type AuthUser } from "@/lib/get-auth-user";
import { apiError } from "@/lib/api-error";
import type { ErrorCode } from "@/lib/contracts/errors";

export type VendorBlockCode = Extract<ErrorCode, "MOU_REQUIRED" | "SUBSCRIPTION_EXPIRED" | "SHOP_PENDING">;

export interface VendorGateInput {
  mouAccepted: boolean;
  access: SubscriptionAccessState;
  isApproved: boolean;
}

export interface VendorGateOptions {
  /** Block when the subscription is expired (selling features only). */
  subscription?: boolean;
  /** Block when the shop is not approved. */
  approval?: boolean;
}

/** Pure decision: the first gate that blocks, or null. */
export function vendorBlockCode(input: VendorGateInput, opts: VendorGateOptions = {}): VendorBlockCode | null {
  if (!input.mouAccepted) return "MOU_REQUIRED";
  if (opts.subscription && input.access.isBlocked) return "SUBSCRIPTION_EXPIRED";
  if (opts.approval && !input.isApproved) return "SHOP_PENDING";
  return null;
}

const BLOCK_MESSAGES: Record<VendorBlockCode, string> = {
  MOU_REQUIRED: "Please review and accept the vendor agreement (MOU) to continue.",
  SUBSCRIPTION_EXPIRED: "Your subscription has expired. Renew it on the website to continue.",
  SHOP_PENDING: "Your shop is pending approval.",
};

export interface VendorContext extends VendorGateInput {
  user: AuthUser;
  shopId: string;
  subscription: (SubscriptionLike & { source?: string }) | null;
}

/** Loads everything the gates need, without deciding. */
export async function loadVendorContext(user: AuthUser): Promise<VendorContext | null> {
  await connectDB();
  let shopId = user.shopId;
  if (!shopId) {
    const owned = await Shop.findOne({ ownerId: user.id }).select("_id").lean<{ _id: unknown }>();
    shopId = owned ? String(owned._id) : null;
  }
  if (!shopId) return null;
  const [shop, subscription, mou] = await Promise.all([
    Shop.findById(shopId).select("isApproved").lean<{ isApproved?: boolean }>(),
    VendorSubscription.findOne({ shopId }).lean<SubscriptionLike & { source?: string }>(),
    VendorMouAcceptance.exists({ userId: user.id, mouVersion: CURRENT_MOU_VERSION }),
  ]);
  if (!shop) return null;
  return {
    user,
    shopId,
    subscription: subscription ?? null,
    mouAccepted: !!mou,
    access: getSubscriptionAccessState(subscription),
    isApproved: !!shop.isApproved,
  };
}

type GuardResult =
  | ({ ok: true } & VendorContext)
  | { ok: false; response: ReturnType<typeof apiError> };

// `message` duplicates `error` because existing web vendor pages read `message`.
const fail = (code: ErrorCode, message: string, status: number, extra: Record<string, unknown> = {}) =>
  ({ ok: false, response: apiError(code, message, status, { message, ...extra }) }) as const;

export async function requireVendor(req: Request, opts: VendorGateOptions = {}): Promise<GuardResult> {
  const user = await getAuthUser(req);
  if (!user) return fail("UNAUTHORIZED", "Unauthorized", 401);
  if (user.role !== "shop_owner") return fail("NOT_VENDOR", "Vendor account required", 403);

  const ctx = await loadVendorContext(user);
  if (!ctx) return fail("SHOP_NOT_FOUND", "Shop not found. Please complete vendor setup.", 404);

  const code = vendorBlockCode(ctx, opts);
  if (code) {
    const extra =
      code === "SUBSCRIPTION_EXPIRED"
        ? { subscriptionStatus: ctx.access.status, expiryDate: ctx.subscription?.expiryDate ?? null }
        : code === "MOU_REQUIRED"
          ? { mouVersion: CURRENT_MOU_VERSION }
          : {};
    return fail(code, BLOCK_MESSAGES[code], 403, extra);
  }
  return { ok: true, ...ctx };
}
