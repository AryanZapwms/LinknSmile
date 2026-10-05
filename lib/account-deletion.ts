// lib/account-deletion.ts
//
// Self-service account deletion (App Store 5.1.1(v), Google Play account
// deletion policy), used by DELETE /api/users/me.
//
// The User document is kept but anonymized and deactivated, because Orders
// reference it and are kept as tax/accounting records. Personal data that
// is not needed for those records is deleted or scrubbed. Every refresh
// token is revoked; a web session ends at its next re-check (≤1 h, the
// user is inactive) and a mobile access token within 15 minutes.
//
// Blocked while the account has open orders (as buyer or on the vendor's
// shop). A vendor's shop and wallet are closed through the vendor exit flow
// (lib/vendor-exit.ts) first — see app/api/users/me — which applies its own
// wallet rules (frozen, pending sales, payout in flight, final settlement).

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Order } from "@/lib/models/order";
import Address from "@/lib/models/address";
import { Cart } from "@/lib/models/cart";
import Wishlist from "@/lib/models/wishlist";
import Favourite from "@/lib/models/Favourite";
import { Review } from "@/lib/models/review";
import { RazorpayCheckout } from "@/lib/models/razorpay-checkout";
import { AuditLog } from "@/lib/models/audit-log";
import { revokeAllRefreshTokens } from "@/lib/mobile-tokens";

export const OPEN_ORDER_STATUSES = ["pending", "processing", "shipped"] as const;

/** Number of orders still in progress for this user as buyer, or on their shop. */
export async function openOrderCount(userId: string, shopId: string | null): Promise<number> {
  await connectDB();
  const open: any = { orderStatus: { $in: OPEN_ORDER_STATUSES } };
  const buyerOpen = await Order.countDocuments({ ...open, user: new mongoose.Types.ObjectId(userId) });
  const shopOpen = shopId ? await Order.countDocuments({ ...open, "items.shopId": new mongoose.Types.ObjectId(shopId) }) : 0;
  return buyerOpen + shopOpen;
}

/**
 * Deletes/anonymizes. Personal data is removed first and the User record
 * last, so a failure part-way leaves a still-usable account that can retry.
 */
export async function deleteAccount(params: { userId: string; shopId: string | null; email: string }) {
  const { userId, shopId, email } = params;
  // A vendor's shop/wallet must already be closed by exitVendor().
  await connectDB();
  const uid = new mongoose.Types.ObjectId(userId);

  await Promise.all([
    Address.deleteMany({ userId: uid }),
    Cart.deleteMany({ userId: uid }),
    Wishlist.deleteMany({ userId: uid }),
    Favourite.deleteMany({ userId }),
    Review.updateMany({ user: uid }, { $set: { userName: "Deleted user", userEmail: "" } }),
    // Finished checkouts only: an unpaid one may still be completed by the webhook.
    RazorpayCheckout.updateMany(
      { userId: uid, status: { $in: ["fulfilled", "rejected"] } },
      { $unset: { shippingAddress: 1 } }
    ),
    mongoose.connection.collection("otps").deleteMany({ email }),
  ]);

  await User.updateOne(
    { _id: uid },
    {
      $set: {
        email: `deleted-${userId}@deleted.invalid`,
        name: "Deleted user",
        isActive: false,
        isVerified: false,
        pushTokens: [],
        pendingVendorApplication: false,
        deletedAt: new Date(),
      },
      $unset: { password: 1, phone: 1, address: 1, resetOtpHash: 1, resetOtpExpires: 1, resetOtpAttempts: 1, locale: 1 },
    }
  );
  await revokeAllRefreshTokens(userId, "account_deleted");

  try {
    await AuditLog.create({
      action: "ACCOUNT_DELETED",
      performedBy: userId,
      targetEntity: "User",
      targetId: userId,
      ...(shopId ? { shopId } : {}),
      reason: "Self-service account deletion",
    });
  } catch (err) {
    // The deletion itself is done; the audit row is best-effort.
    console.error("[account-deletion] AUDIT_LOG_WRITE_FAILED", { userId, err });
  }
}
