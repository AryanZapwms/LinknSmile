// lib/vendor-exit.ts
//
// A vendor leaving the platform: shared by POST /api/vendor/exit and vendor
// self-deletion (DELETE /api/users/me). Extracted from the exit route with
// the same rules and messages:
//   - blocked while the wallet is frozen, sales are still pending, or a
//     payout is in flight;
//   - any withdrawable balance becomes a final settlement payout (needs
//     bank details);
//   - the shop is archived, its products deactivated, and the wallet closed.
// Idempotent: a vendor who already exited (wallet CLOSED, or no wallet and
// shop already archived) gets success without a second settlement payout.

import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/lib/models/wallet";
import { LedgerEntry } from "@/lib/models/ledger";
import { AuditLog } from "@/lib/models/audit-log";
import Shop from "@/lib/models/shop";
import Payout from "@/lib/models/payout";
import { Product } from "@/lib/models/product";
import { formatCurrency } from "@/lib/currency";

const EXIT_REASON = "Vendor Voluntarily Exited";

export type VendorExitBlockCode = "SHOP_NOT_FOUND" | "WALLET_FROZEN" | "PENDING_SALES" | "PAYOUT_IN_PROGRESS" | "BANK_DETAILS_REQUIRED";

export type VendorExitResult =
  | { ok: true; alreadyExited: boolean; settledAmount: number; message: string }
  | { ok: false; code: VendorExitBlockCode; status: number; message: string };

const block = (code: VendorExitBlockCode, message: string, status = 400): VendorExitResult => ({ ok: false, code, status, message });

export async function exitVendor(userId: string): Promise<VendorExitResult> {
  await connectDB();
  const uid = new mongoose.Types.ObjectId(userId);
  const shop = await Shop.findOne({ ownerId: uid });
  if (!shop) return block("SHOP_NOT_FOUND", "Shop not found", 404);

  const wallet = await Wallet.findOne({ shopId: shop._id, type: "VENDOR" });
  if (!wallet) {
    if (!shop.isActive && shop.rejectionReason === EXIT_REASON) {
      return { ok: true, alreadyExited: true, settledAmount: 0, message: "Your account has already been closed." };
    }
    // No wallet = no earnings, just close the shop directly
    await Shop.findByIdAndUpdate(shop._id, { isActive: false, isApproved: false, rejectionReason: EXIT_REASON });
    await Product.updateMany({ shopId: shop._id }, { $set: { isActive: false } });
    await AuditLog.create({
      action: "VENDOR_EXIT_NO_WALLET",
      performedBy: userId,
      targetEntity: "Shop",
      targetId: String(shop._id),
      shopId: shop._id,
      reason: "Vendor exit with no wallet found",
    });
    return { ok: true, alreadyExited: false, settledAmount: 0, message: "Account closed successfully." };
  }

  // Already exited: never create a second settlement payout.
  if (wallet.status === "CLOSED") {
    return { ok: true, alreadyExited: true, settledAmount: 0, message: "Your account has already been closed." };
  }

  // 1. Block exit if wallet is FROZEN (active dispute)
  if (wallet.status === "FROZEN") {
    return block("WALLET_FROZEN", "Your wallet is currently frozen due to an active dispute or review. Please contact support.");
  }

  // 2. Block exit if there are PENDING ledger entries (undelivered orders)
  const pendingCount = await LedgerEntry.countDocuments({ accountId: wallet._id, status: "PENDING", type: "SALE" });
  if (pendingCount > 0) {
    return block(
      "PENDING_SALES",
      `Cannot exit yet. You have ${pendingCount} pending order(s) not yet cleared. ` +
        `Please wait for them to be delivered and cleared (T+7 days from delivery).`
    );
  }

  // 3. Block if there's an in-flight payout
  const inFlightPayout = await Payout.findOne({ shopId: shop._id, status: { $in: ["REQUESTED", "APPROVED", "PROCESSING"] } });
  if (inFlightPayout) {
    return block(
      "PAYOUT_IN_PROGRESS",
      `Cannot exit while a payout request (${formatCurrency(inFlightPayout.amount)}) is being processed. Please wait for it to complete.`
    );
  }

  // 4. If there's a withdrawable balance, create final settlement payout
  const settleableAmount = wallet.withdrawableBalance;
  if (settleableAmount > 0) {
    if (!shop.bankDetails?.accountNumber) {
      return block(
        "BANK_DETAILS_REQUIRED",
        `You have ${formatCurrency(settleableAmount)} remaining balance. Please add bank account details in Settings so we can process your final settlement.`
      );
    }

    // Override minimum threshold for exit settlement
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`EXIT_SETTLEMENT|${shop._id}|${settleableAmount}|${Date.now()}`)
      .digest("hex");

    await Payout.create({
      shopId: shop._id,
      amount: settleableAmount,
      idempotencyKey,
      status: "REQUESTED",
      bankAccountNumber: `****${shop.bankDetails.accountNumber.slice(-4)}`,
      bankIfsc: shop.bankDetails?.ifscCode,
      bankName: shop.bankDetails?.bankName,
      notes: "FINAL EXIT SETTLEMENT — Minimum threshold overridden",
      isExitSettlement: true,
      orderIds: [],
    });
  }

  // 5. Archive the shop, and take its products off the storefront (the
  //    storefront and checkout don't look at the shop's status).
  await Shop.findByIdAndUpdate(shop._id, { isActive: false, isApproved: false, rejectionReason: EXIT_REASON });
  await Product.updateMany({ shopId: shop._id }, { $set: { isActive: false } });

  // 6. Close the wallet
  await Wallet.findByIdAndUpdate(wallet._id, { status: "CLOSED" });

  // 7. Immutable audit log
  await AuditLog.create({
    action: "VENDOR_EXIT_COMPLETED",
    performedBy: userId,
    targetEntity: "Shop",
    targetId: String(shop._id),
    shopId: shop._id,
    metadata: { settledAmount: settleableAmount, hasSettlementPayout: settleableAmount > 0, exitedAt: new Date() },
    reason: "Vendor voluntarily exited the platform",
  });

  return {
    ok: true,
    alreadyExited: false,
    settledAmount: settleableAmount,
    message:
      settleableAmount > 0
        ? `Your account has been closed. Final settlement of ${formatCurrency(settleableAmount)} will be processed to your bank account within 3-5 business days.`
        : "Your account has been closed successfully.",
  };
}
