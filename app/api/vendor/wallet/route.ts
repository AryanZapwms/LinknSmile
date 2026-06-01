// app/api/vendor/wallet/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import Shop from "@/lib/models/shop";
import { Wallet } from "@/lib/models/wallet";

export const dynamic = 'force-dynamic';

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

    // Recalculate balances from orders
    const orders = await Order.find({ 'items.shopId': shop._id });
    let withdrawable = 0, pending = 0, frozen = 0;

    for (const order of orders) {
      const vendorPayout = order.vendorPayouts?.find(
        (p: any) => p.shopId?.toString() === shop._id.toString()
      );
      const vendorEarnings = order.items
        .filter((item: any) => item.shopId?.toString() === shop._id.toString())
        .reduce((sum: number, item: any) => sum + (item.vendorEarnings || 0), 0);

      if (vendorPayout?.status === "released") withdrawable += vendorEarnings;
      else if (vendorPayout?.status === "held") frozen += vendorEarnings;
      else pending += vendorEarnings;
    }

    wallet.withdrawableBalance = withdrawable;
    wallet.pendingBalance = pending;
    wallet.frozenBalance = frozen;
    await wallet.save();

    return NextResponse.json({
      totalBalance: withdrawable + pending + frozen,
      pendingBalance: pending,
      withdrawableBalance: withdrawable,
      frozenBalance: frozen,
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