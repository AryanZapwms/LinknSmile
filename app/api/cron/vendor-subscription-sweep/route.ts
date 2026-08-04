/**
 * GET /api/cron/vendor-subscription-sweep
 *
 * Meant to run once daily. Protected by CRON_SECRET, same pattern as
 * /api/cron/clear-pending-funds.
 *
 * NOTE: production currently runs on a self-hosted CyberPanel VPS via PM2
 * (see Deployment.md), not Vercel — the `vercel.json` cron entry for this
 * route will NOT fire there. A real trigger (Linux crontab + curl, or an
 * external scheduler) hitting this URL with `Authorization: Bearer
 * $CRON_SECRET` once a day is required for this to actually run.
 *
 * What it does (all bookkeeping — actual access gating is computed live
 * from `expiryDate` via lib/vendor-subscription-status.ts on every
 * request, so grace-period/hard-block behavior is correct even if this
 * cron is delayed or misses a day):
 *   1. Flips `status: "active"` → `"expired"` once expiryDate has passed.
 *   2. Sends the 7-day-before reminder, daily grace-period reminders, and
 *      the day-27 final storefront warning.
 *   3. Hides (`hiddenBySubscription: true`) all of a shop's products once
 *      more than 30 days have passed since expiryDate — data is untouched,
 *      renewal (see verify-payment route) unhides them immediately.
 */
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import Shop from "@/lib/models/shop";
import { Product } from "@/lib/models/product";
import { AuditLog } from "@/lib/models/audit-log";
import { getSubscriptionAccessState } from "@/lib/vendor-subscription-status";
import {
  sendEmail,
  getVendorSubscriptionExpiryReminderEmail,
  getVendorSubscriptionStorefrontWarningEmail,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STOREFRONT_HIDE_DAYS = 30;

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    await connectDB();
    const now = new Date();

    const result = {
      expiredFlipped: 0,
      remindersSent: 0,
      finalWarningsSent: 0,
      shopsHidden: 0,
    };

    // 1. Flip active → expired once the expiry date has passed.
    const flipResult = await VendorSubscription.updateMany(
      { status: "active", expiryDate: { $lt: now } },
      { $set: { status: "expired" } }
    );
    result.expiredFlipped = flipResult.modifiedCount || 0;

    // 2 & 3. Walk every non-cancelled, non-pending subscription that has an
    // expiryDate to decide reminders + storefront hiding. Small collection
    // (one doc per vendor) — fine to load fully rather than a hot-path query.
    // Cancelled subs are included too — cancellation follows the same
    // 30-day storefront decay, measured from cancelledAt (see the admin
    // cancel route, which pins expiryDate = cancelledAt for this reason).
    const subs = await VendorSubscription.find({
      status: { $in: ["active", "expired", "cancelled"] },
      expiryDate: { $ne: null },
    }).lean();

    for (const sub of subs) {
      const access = getSubscriptionAccessState(sub, now);
      const daysUntilExpiry = access.daysUntilExpiry ?? 0;
      const daysSinceExpiry = -daysUntilExpiry;

      const needsReminder =
        daysUntilExpiry === 7 || (access.isInGracePeriod && daysSinceExpiry >= 1);
      const needsFinalWarning = daysSinceExpiry === STOREFRONT_HIDE_DAYS - 3; // day 27
      const needsStorefrontHide = daysSinceExpiry > STOREFRONT_HIDE_DAYS && access.isBlocked;

      if (!needsReminder && !needsFinalWarning && !needsStorefrontHide) continue;

      const shop = await Shop.findById(sub.shopId).populate("ownerId", "name email").lean<any>();
      if (!shop?.ownerId?.email) continue;
      const vendorName = shop.ownerId.name || "Vendor";
      const shopName = shop.shopName;

      try {
        if (needsReminder) {
          await sendEmail({
            to: shop.ownerId.email,
            subject: `Subscription ${access.isInGracePeriod ? "Expired" : "Expiring Soon"} - ${shopName}`,
            html: getVendorSubscriptionExpiryReminderEmail({
              vendorName,
              shopName,
              expiryDate: new Date(sub.expiryDate!),
              daysRemaining: daysUntilExpiry,
            }),
          });
          result.remindersSent++;
        }

        if (needsFinalWarning) {
          await sendEmail({
            to: shop.ownerId.email,
            subject: `Final Warning: Products Coming Down - ${shopName}`,
            html: getVendorSubscriptionStorefrontWarningEmail({
              vendorName,
              shopName,
              hideDate: access.storefrontHideDate!,
            }),
          });
          result.finalWarningsSent++;
        }
      } catch (emailError) {
        console.error("[Cron] vendor-subscription-sweep email failed:", emailError);
      }

      if (needsStorefrontHide) {
        const updateResult = await Product.updateMany(
          { shopId: sub.shopId, hiddenBySubscription: { $ne: true } },
          { $set: { hiddenBySubscription: true } }
        );
        if (updateResult.modifiedCount > 0) {
          result.shopsHidden++;
          await AuditLog.create({
            action: "SUBSCRIPTION_STOREFRONT_HIDE",
            performedBy: "SYSTEM",
            targetEntity: "Shop",
            targetId: sub.shopId,
            shopId: sub.shopId,
            metadata: { productsHidden: updateResult.modifiedCount, expiryDate: sub.expiryDate },
          });
        }
      }
    }

    await AuditLog.create({
      action: "CRON_VENDOR_SUBSCRIPTION_SWEEP",
      performedBy: "SYSTEM",
      targetEntity: "VendorSubscription",
      metadata: { ...result, completedAt: new Date() },
    });

    return withCORS(NextResponse.json({ success: true, ...result }));
  } catch (error: any) {
    console.error("[Cron] vendor-subscription-sweep error:", error);
    return withCORS(
      NextResponse.json({ error: "Cron job failed", details: error.message }, { status: 500 })
    );
  }
}
