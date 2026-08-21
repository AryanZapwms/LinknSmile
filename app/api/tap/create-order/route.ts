import { withCORS } from "@/lib/cors";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { computeOrderPricing, PricingError } from "@/lib/pricing";
import { CURRENCY_CODE } from "@/lib/currency";
import { tapAdapter } from "@/lib/payments/tap";
import { PaymentGatewayError } from "@/lib/payments/types";

// Checkout create-order for the Tap gateway. Mirrors
// app/api/razorpay/create-order's pricing recomputation exactly — only
// the "talk to the gateway" step differs, via lib/payments/tap.ts. Since
// Tap's checkout is a full-page redirect (not a client-side widget),
// shippingAddress/couponCode won't survive the round trip in React state,
// so they're passed through as Tap `metadata` and read back on
// verification — see lib/payments/tap.ts's file header for why.
export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }));
    }

    const { items, couponCode, shippingAddress } = await request.json();

    if (!shippingAddress) {
      return withCORS(NextResponse.json({ error: "Shipping address is required" }, { status: 400 }));
    }

    await connectDB();
    const { totalAmount } = await computeOrderPricing(items, {
      couponCode: couponCode || undefined,
      userId: session.user.id,
    });

    if (!totalAmount || totalAmount <= 0) {
      return withCORS(NextResponse.json({ error: "Invalid order total" }, { status: 400 }));
    }

    const charge = await tapAdapter.createPaymentOrder({
      amount: totalAmount,
      currency: CURRENCY_CODE,
      reference: `checkout-${session.user.id}-${Date.now()}`,
      metadata: {
        userId: session.user.id,
        // Stashed here (not read from a session) because both the
        // redirect-return page and the server-to-server webhook need this
        // for the customer's order-confirmation email, and the webhook in
        // particular has no session at all.
        userEmail: session.user.email || "",
        userName: session.user.name || "",
        items: JSON.stringify(items),
        shippingAddress: JSON.stringify(shippingAddress),
        couponCode: couponCode || "",
      },
    });

    return withCORS(
      NextResponse.json({
        id: charge.gatewayOrderId,
        redirectUrl: charge.redirectUrl,
        totalAmount, // rupees/dirhams/etc — for display only
      })
    );
  } catch (error) {
    if (error instanceof PricingError || error instanceof PaymentGatewayError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Tap create-order error:", error);
    return withCORS(NextResponse.json({ error: "Failed to create Tap charge" }, { status: 500 }));
  }
}
