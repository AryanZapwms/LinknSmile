import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { VendorSubscriptionSettings } from "@/lib/models/vendor-subscription-settings";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }));
    }

    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ error: "No shop found for this account." }, { status: 404 }));
    }

    await connectDB();

    // Fee amount is server-side/admin-configured — never trust a client-sent amount.
    let settings = await VendorSubscriptionSettings.findOne();
    if (!settings) {
      settings = await VendorSubscriptionSettings.create({});
    }
    const amount = settings.annualFeeAmount;
    const currency = settings.currency || "INR";

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency,
      payment_capture: true,
    });

    // Track the pending attempt so the admin table can see "payment initiated".
    // verify-payment remains the source of truth for actually activating access.
    await VendorSubscription.findOneAndUpdate(
      { shopId },
      {
        $setOnInsert: { shopId, paymentHistory: [] },
        $set: {
          status: "pending",
          amount,
          currency,
          razorpayOrderId: razorpayOrder.id,
        },
      },
      { upsert: true, new: true }
    );

    return withCORS(
      NextResponse.json({
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        annualFeeAmount: amount, // rupees — for display only
      })
    );
  } catch (error) {
    console.error("Vendor subscription create-order error:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to create subscription order" }, { status: 500 })
    );
  }
}
