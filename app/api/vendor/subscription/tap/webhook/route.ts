import { type NextRequest, NextResponse } from "next/server";
import { verifyTapWebhookSignature, type TapCharge } from "@/lib/payments/tap";
import { fulfillSubscriptionPayment } from "@/lib/subscription-fulfillment";

// Server-to-server confirmation for vendor subscription renewals paid via
// Tap — same reasoning as app/api/tap/webhook, mirrored for the
// subscription flow per the "mirror whatever pattern you land on for
// checkout" instruction. Idempotent via the same paymentHistory lookup
// fulfillSubscriptionPayment already does.
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
      console.error("[Tap subscription webhook] Invalid hashstring — rejecting", { chargeId: charge.id });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (charge.status !== "CAPTURED") {
      return NextResponse.json({ received: true });
    }

    const shopId = charge.metadata?.shopId;
    if (!shopId) {
      console.error("[Tap subscription webhook] Captured charge missing shopId metadata", {
        chargeId: charge.id,
      });
      return NextResponse.json({ error: "Missing shopId metadata" }, { status: 422 });
    }

    try {
      await fulfillSubscriptionPayment({
        shopId,
        gateway: { paymentMethod: "tap", gatewayOrderId: charge.id, gatewayPaymentId: charge.id },
      });
    } catch (e: any) {
      console.error("[Tap subscription webhook] Fulfillment failed:", e.message);
      return NextResponse.json({ received: true, warning: e.message });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Tap subscription webhook] Unexpected error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
