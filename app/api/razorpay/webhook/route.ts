// app/api/razorpay/webhook/route.ts
//
// Razorpay server-to-server webhook (configure event: payment.captured).
// Completes storefront orders whose browser verify-payment never arrived
// (tab closed, network drop, "not captured yet" at verify time). Uses the
// exact same fulfilRazorpayCheckout() as verify-payment, so a webhook
// arriving before, after or alongside the browser never creates a second
// Order or ledger entry.
//
// Response codes matter: Razorpay retries any non-2xx. We return 503 only
// for transient states worth retrying, and 200 for everything final
// (including rejections, which are logged for the runbook:
// docs/runbooks/razorpay-payment-alerts.md).
//
// Vendor subscription renewals are completed here too, through their
// SubscriptionCheckout record (lib/subscription-checkout-fulfillment.ts),
// so a vendor who pays and closes the tab is still renewed. Orders with
// neither record — renewals and storefront checkouts created before those
// records existed — are acknowledged with 200 and ignored.

import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { RazorpayCheckout } from "@/lib/models/razorpay-checkout";
import { fulfilRazorpayCheckout } from "@/lib/razorpay-fulfillment";
import { SubscriptionCheckout } from "@/lib/models/subscription-checkout";
import { fulfilSubscriptionCheckout } from "@/lib/subscription-checkout-fulfillment";

function signatureValid(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const ok = (body: Record<string, unknown> = { received: true }) => NextResponse.json(body, { status: 200 });
const retryLater = (reason: string) =>
  NextResponse.json({ error: reason }, { status: 503, headers: { "Retry-After": "60" } });

export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: never process unauthenticated webhooks. 503 so Razorpay
    // retries once the secret is configured.
    console.error("[Razorpay webhook] RAZORPAY_WEBHOOK_SECRET is not set — webhook rejected");
    return retryLater("Webhook not configured");
  }

  const rawBody = await request.text();
  if (!signatureValid(rawBody, request.headers.get("x-razorpay-signature"), secret)) {
    console.error("[Razorpay webhook] INVALID_SIGNATURE", {
      eventId: request.headers.get("x-razorpay-event-id"),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event?.event !== "payment.captured") {
    return ok({ received: true, ignored: event?.event ?? "unknown" });
  }

  const payment = event?.payload?.payment?.entity;
  const razorpayOrderId: string | undefined = payment?.order_id;
  const razorpayPaymentId: string | undefined = payment?.id;
  if (!razorpayOrderId || !razorpayPaymentId) {
    console.error("[Razorpay webhook] payment.captured without order_id/payment id", {
      paymentId: razorpayPaymentId ?? null,
    });
    return ok({ received: true, ignored: "no order_id" });
  }

  try {
    await connectDB();
    if (!(await RazorpayCheckout.exists({ razorpayOrderId }))) {
      // Vendor subscription renewal (lib/subscription-checkout-fulfillment.ts).
      if (await SubscriptionCheckout.exists({ razorpayOrderId })) {
        const sub = await fulfilSubscriptionCheckout({ razorpayOrderId, razorpayPaymentId, source: "webhook" });
        switch (sub.kind) {
          case "fulfilled":
            return ok({ received: true, subscriptionId: sub.subscriptionId, alreadyDone: sub.alreadyDone });
          case "in_progress":
          case "lookup_failed":
          case "not_captured":
            return retryLater(sub.kind);
          default:
            return ok({ received: true, outcome: sub.kind });
        }
      }
      // Subscription orders created before SubscriptionCheckout existed, and
      // pre-deploy storefront checkouts — see the runbook.
      console.warn("[Razorpay webhook] WEBHOOK_IGNORED_UNKNOWN_ORDER", {
        razorpayOrderId,
        razorpayPaymentId,
        amountMinor: payment?.amount,
        currency: payment?.currency,
      });
      return ok({ received: true, ignored: "unknown order" });
    }

    const result = await fulfilRazorpayCheckout({
      razorpayOrderId,
      razorpayPaymentId,
      source: "webhook",
    });

    switch (result.kind) {
      case "fulfilled":
        return ok({ received: true, orderId: result.orderId, alreadyDone: result.alreadyDone });
      case "in_progress":
      case "lookup_failed":
      case "not_captured":
        return retryLater(result.kind);
      default:
        // Final outcomes (rejected, refund required, mismatches, missing
        // address, …) are already logged by fulfilRazorpayCheckout.
        return ok({ received: true, outcome: result.kind });
    }
  } catch (err) {
    console.error("[Razorpay webhook] unexpected error — Razorpay will retry", {
      razorpayOrderId,
      razorpayPaymentId,
      err,
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
