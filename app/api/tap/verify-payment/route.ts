import { withCORS } from "@/lib/cors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { type NextRequest, NextResponse } from "next/server";
import { paymentLimiter } from "@/lib/rate-limit";
import { tapAdapter } from "@/lib/payments/tap";
import { PaymentGatewayError } from "@/lib/payments/types";
import { fulfillPaidOrder, PricingError } from "@/lib/order-fulfillment";

// Called from app/checkout/tap-return/page.tsx once the customer's
// browser comes back from Tap's hosted checkout with ?tap_id=. Retrieves
// the charge server-side (never trusts the redirect alone — a bare
// redirect to this URL proves nothing on its own), reads back the
// items/shippingAddress/couponCode that were stashed in the charge's
// metadata at create-order time (see app/api/tap/create-order), and runs
// the exact same fulfillment path Razorpay uses.
//
// app/api/tap/webhook covers the case where the customer never makes it
// back here at all (closed tab, dropped connection) — both paths funnel
// into the same idempotent fulfillPaidOrder, so whichever fires first wins
// and the other is a safe no-op.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = paymentLimiter(ip);
  if (!success) {
    return Response.json(
      { error: "Too many requests. Please wait a minute before trying again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { tapId } = await request.json();
    if (!tapId) {
      return withCORS(NextResponse.json({ error: "Missing Tap charge ID" }, { status: 400 }));
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const result = await tapAdapter.verifyPayment({ chargeId: tapId });

    const metadata = result.metadata || {};
    if (metadata.userId && metadata.userId !== session.user.id) {
      return withCORS(NextResponse.json({ error: "This charge does not belong to you" }, { status: 403 }));
    }
    if (!result.success) {
      return withCORS(NextResponse.json({ error: "Payment was not completed" }, { status: 400 }));
    }

    let items: unknown;
    let shippingAddress: unknown;
    try {
      items = JSON.parse(metadata.items || "[]");
      shippingAddress = JSON.parse(metadata.shippingAddress || "null");
    } catch {
      return withCORS(
        NextResponse.json({ error: "Charge metadata was malformed — cannot fulfill order" }, { status: 500 })
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return withCORS(NextResponse.json({ error: "No items in order" }, { status: 400 }));
    }
    if (!shippingAddress) {
      return withCORS(NextResponse.json({ error: "Shipping address is required" }, { status: 400 }));
    }

    const { orderId } = await fulfillPaidOrder({
      userId: session.user.id,
      userEmail: metadata.userEmail || session.user.email,
      userName: metadata.userName || session.user.name,
      items: items as any,
      shippingAddress,
      couponCode: metadata.couponCode || undefined,
      gateway: {
        paymentMethod: "tap",
        gatewayOrderId: result.gatewayOrderId,
        gatewayPaymentId: result.gatewayPaymentId,
      },
    });

    return withCORS(NextResponse.json({ success: true, orderId }));
  } catch (error) {
    if (error instanceof PricingError || error instanceof PaymentGatewayError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Tap verify-payment error:", error);
    return withCORS(NextResponse.json({ error: "Payment verification failed" }, { status: 500 }));
  }
}
