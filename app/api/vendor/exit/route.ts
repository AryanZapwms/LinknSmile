import { connectDB } from "@/lib/db";
import { Wallet } from "@/lib/models/wallet";
import { LedgerEntry } from "@/lib/models/ledger";
import { AuditLog } from "@/lib/models/audit-log";
import Shop from "@/lib/models/shop";
import Payout from "@/lib/models/payout";
import { User } from "@/lib/models/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    const shop = await Shop.findOne({ ownerId: user?._id });
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const wallet = await Wallet.findOne({ shopId: shop._id, type: "VENDOR" });
    if (!wallet) {
      // No wallet = no earnings, just close the shop directly
      await Shop.findByIdAndUpdate(shop._id, {
        isActive: false,
        isApproved: false,
        rejectionReason: "Vendor Voluntarily Exited",
      });
      await AuditLog.create({
        action: "VENDOR_EXIT_NO_WALLET",
        performedBy: user._id.toString(),
        targetEntity: "Shop",
        targetId: shop._id.toString(),
        shopId: shop._id,
        reason: "Vendor exit with no wallet found",
      });
      return NextResponse.json({ success: true, message: "Account closed successfully." });
    }

    // 1. Block exit if wallet is FROZEN (active dispute)
    if (wallet.status === "FROZEN") {
      return NextResponse.json({
        error: "Your wallet is currently frozen due to an active dispute or review. Please contact support.",
      }, { status: 400 });
    }

    // 2. Block exit if there are PENDING ledger entries (undelivered orders)
    const pendingCount = await LedgerEntry.countDocuments({
      accountId: wallet._id,
      status: "PENDING",
      type: "SALE",
    });

    if (pendingCount > 0) {
      return NextResponse.json({
        error: `Cannot exit yet. You have ${pendingCount} pending order(s) not yet cleared. ` +
          `Please wait for them to be delivered and cleared (T+7 days from delivery).`,
      }, { status: 400 });
    }

    // 3. Block if there's an in-flight payout
    const inFlightPayout = await Payout.findOne({
      shopId: shop._id,
      status: { $in: ["REQUESTED", "APPROVED", "PROCESSING"] },
    });
    if (inFlightPayout) {
      return NextResponse.json({
        error: `Cannot exit while a payout request (₹${inFlightPayout.amount}) is being processed. Please wait for it to complete.`,
      }, { status: 400 });
    }

    // 4. If there's a withdrawable balance, create final settlement payout
    const settleableAmount = wallet.withdrawableBalance;

    if (settleableAmount > 0) {
      if (!shop.bankDetails?.accountNumber) {
        return NextResponse.json({
          error: `You have ₹${settleableAmount} remaining balance. Please add bank account details in Settings so we can process your final settlement.`,
        }, { status: 400 });
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
        bankAccountNumber: shop.bankDetails?.accountNumber
          ? `****${shop.bankDetails.accountNumber.slice(-4)}`
          : undefined,
        bankIfsc: shop.bankDetails?.ifsc,
        bankName: shop.bankDetails?.bankName,
        notes: "FINAL EXIT SETTLEMENT — Minimum threshold overridden",
        isExitSettlement: true,
        orderIds: [],
      });
    }

    // 5. Archive the shop
    await Shop.findByIdAndUpdate(shop._id, {
      isActive: false,
      isApproved: false,
      rejectionReason: "Vendor Voluntarily Exited",
    });

    // 6. Close the wallet
    await Wallet.findByIdAndUpdate(wallet._id, { status: "CLOSED" });

    // 7. Immutable audit log
    await AuditLog.create({
      action: "VENDOR_EXIT_COMPLETED",
      performedBy: user._id.toString(),
      targetEntity: "Shop",
      targetId: shop._id.toString(),
      shopId: shop._id,
      metadata: {
        settledAmount: settleableAmount,
        hasSettlementPayout: settleableAmount > 0,
        exitedAt: new Date(),
      },
      reason: "Vendor voluntarily exited the platform",
    });

    return NextResponse.json({
      success: true,
      message: settleableAmount > 0
        ? `Your account has been closed. Final settlement of ₹${settleableAmount.toFixed(2)} will be processed to your bank account within 3-5 business days.`
        : "Your account has been closed successfully.",
    });
  } catch (error: any) {
    console.error("Vendor exit error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
