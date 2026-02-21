import { connectDB } from "@/lib/db";
import { Wallet } from "@/lib/models/wallet";
import { LedgerService } from "@/lib/services/ledger-service";
import Shop from "@/lib/models/shop";
import Payout from "@/lib/models/payout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    await connectDB();

    const { User } = await import("@/lib/models/user");
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const shop = await Shop.findOne({ ownerId: user._id });
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const wallet = await Wallet.findOne({ shopId: shop._id, type: "VENDOR" });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    if (wallet.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Wallet is ${wallet.status}. Withdrawals are disabled.` },
        { status: 403 }
      );
    }

    if (amount < wallet.minimumThreshold) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₹${wallet.minimumThreshold}` },
        { status: 400 }
      );
    }

    if (wallet.withdrawableBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient withdrawable balance. Available: ₹${wallet.withdrawableBalance}` },
        { status: 400 }
      );
    }

    // Check for any pending payout already in flight (prevent double-submit)
    const pendingPayout = await Payout.findOne({
      shopId: shop._id,
      status: { $in: ["REQUESTED", "APPROVED", "PROCESSING"] },
    });
    if (pendingPayout) {
      return NextResponse.json(
        { error: "You already have a payout in progress. Wait for it to complete." },
        { status: 409 }
      );
    }

    // Generate idempotency key: hash of shopId + amount + day (one request per amount per day max)
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${shop._id}|${amount}|${new Date().toISOString().slice(0, 10)}`)
      .digest("hex");

    // Upsert-safe: if same key exists, return existing payout (idempotent)
    const existingPayout = await Payout.findOne({ idempotencyKey });
    if (existingPayout) {
      return NextResponse.json({
        success: true,
        payoutId: existingPayout._id,
        message: "Payout request already submitted (idempotent)",
      });
    }

    // Create payout record
    const payout = await Payout.create({
      shopId: shop._id,
      amount,
      idempotencyKey,
      status: "REQUESTED",
    });

    // Deduct from wallet via ledger (source of truth)
    await LedgerService.requestPayout({
      shopId: shop._id.toString(),
      amount,
      payoutId: payout._id.toString(),
    });

    return NextResponse.json({
      success: true,
      payoutId: payout._id,
      message: "Payout request submitted successfully",
    });

  } catch (error: any) {
    console.error("[Payout Request]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}