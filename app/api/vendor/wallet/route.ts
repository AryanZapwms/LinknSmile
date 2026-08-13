// app/api/vendor/wallet/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { Wallet } from "@/lib/models/wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "shop_owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Use shopId directly from session (more reliable)
    const shop = await Shop.findById(session.user.shopId);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Rest of your wallet logic (same as before)
    let wallet = await Wallet.findOne({ shopId: shop._id, type: "VENDOR" });
    if (!wallet) {
      wallet = await Wallet.create({
        shopId: shop._id,
        type: "VENDOR",
        pendingBalance: 0,
        withdrawableBalance: 0,
        frozenBalance: 0,
        status: "ACTIVE",
        minimumThreshold: 500,
      });
    }

    // Wallet balances are a cache maintained exclusively by LedgerService
    // (see lib/services/ledger-service.ts) — this route only reads them.
    return NextResponse.json({
      totalBalance: wallet.withdrawableBalance + wallet.pendingBalance + wallet.frozenBalance,
      pendingBalance: wallet.pendingBalance,
      withdrawableBalance: wallet.withdrawableBalance,
      frozenBalance: wallet.frozenBalance,
      minimumWithdrawalThreshold: wallet.minimumThreshold,
      isFrozen: wallet.status === "FROZEN",
      isClosed: wallet.status === "CLOSED",
      currency: wallet.currency,
      lastReconciledAt: wallet.lastReconciledAt,
    });
  } catch (error: any) {
    console.error("[Wallet API Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

