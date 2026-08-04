import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { computeOrderPricing, PricingError } from "@/lib/pricing";

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
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }));
    }

    const { items } = await request.json();

    await connectDB();
    const { totalAmount } = await computeOrderPricing(items);

    if (!totalAmount || totalAmount <= 0) {
      return withCORS(NextResponse.json({ error: "Invalid order total" }, { status: 400 }));
    }

   const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise, computed server-side — not client-supplied
      currency: "INR",
      payment_capture: true,
    });

    return withCORS(
      NextResponse.json({
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        totalAmount, // rupees — for display only
      })
    );
  } catch (error) {
    if (error instanceof PricingError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Razorpay create-order error:", error);
    return withCORS(NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 }));
  }
}