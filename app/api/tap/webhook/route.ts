import { type NextRequest, NextResponse } from "next/server";
import { verifyTapWebhookSignature, type TapCharge } from "@/lib/payments/tap";
import { fulfillPaidOrder, PricingError } from "@/lib/order-fulfillment";

// Server-to-server payment confirmation from Tap — the "sure mechanism"
// their own docs recommend for the case where the customer's browser
// never makes it back to app/checkout/tap-return (closed tab, dropped
// connection). This is the piece Razorpay's integration doesn't have at
// all (§16's "no Razorpay webhook handler exists" gap) — Tap gets one
// because Tap's docs explicitly provide for it and recommend it; fixing
// the Razorpay gap itself was explicitly out of scope for this work.
//
// Idempotent: fulfillPaidOrder looks up any existing Order by
// gatewayPaymentId before doing anything, so if the customer's own
// redirect-return already fulfilled this charge via
// app/api/tap/verify-payment, this webhook firing (before, after, or
// racing it) is a safe no-op either way.
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const hashstring = request.headers.get("hashstring");

    let charge: TapCharge;
    try {
      charge = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!verifyTapWebhookSignature(charge, hashstring)) {
      console.error("[Tap webhook] Invalid hashstring — rejecting", { chargeId: charge.id });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (charge.status !== "CAPTURED") {
      // Not a payment we need to act on (e.g. FAILED/ABANDONED) — Tap
      // still expects a 200 so it doesn't keep retrying.
      return NextResponse.json({ received: true });
    }

    const metadata = charge.metadata || {};
    if (!metadata.userId || !metadata.items || !metadata.shippingAddress) {
      console.error("[Tap webhook] Captured charge missing expected metadata", { chargeId: charge.id });
      return NextResponse.json({ error: "Missing order metadata" }, { status: 422 });
    }

    let items: unknown;
    let shippingAddress: unknown;
    try {
      items = JSON.parse(metadata.items);
      shippingAddress = JSON.parse(metadata.shippingAddress);
    } catch {
      console.error("[Tap webhook] Malformed metadata JSON", { chargeId: charge.id });
      return NextResponse.json({ error: "Malformed metadata" }, { status: 422 });
    }

    await fulfillPaidOrder({
      userId: metadata.userId,
      userEmail: metadata.userEmail || undefined,
      userName: metadata.userName || undefined,
      items: items as any,
      shippingAddress,
      couponCode: metadata.couponCode || undefined,
      gateway: {
        paymentMethod: "tap",
        gatewayOrderId: charge.id,
        gatewayPaymentId: charge.id,
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof PricingError) {
      // Pricing failed (e.g. a product went out of stock between charge
      // and webhook) — log for manual review, but still ack the webhook;
      // retrying won't fix a pricing error.
      console.error("[Tap webhook] Order fulfillment failed:", error.message);
      return NextResponse.json({ received: true, warning: error.message });
    }
    console.error("[Tap webhook] Unexpected error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
