// lib/subscription-checkout-fulfillment.ts
//
// "Turn a Razorpay payment into a vendor subscription renewal", shared by
// the browser callback (app/api/vendor/subscription/verify-payment) and the
// Razorpay webhook (app/api/razorpay/webhook). Same shape as
// lib/razorpay-fulfillment.ts for storefront orders: load the
// SubscriptionCheckout written by create-order → atomic claim → confirm
// with Razorpay what was captured → fulfillSubscriptionPayment() → mark
// fulfilled. Whichever arrives first renews; the other gets the same result.
// Callers must have authenticated the payment first (checkout signature or
// webhook signature).
//
// Log tags ([Razorpay subscription] ...) are listed in
// docs/runbooks/razorpay-payment-alerts.md.

import { connectDB } from "@/lib/db";
import { SubscriptionCheckout } from "@/lib/models/subscription-checkout";
import { fetchRazorpayPayment } from "@/lib/payments/razorpay";
import { fulfillSubscriptionPayment } from "@/lib/subscription-fulfillment";

const STALE_CLAIM_MS = 5 * 60 * 1000;
const CAPTURE_POLL_ATTEMPTS = 3;
const CAPTURE_POLL_DELAY_MS = 1500;
// Browser verify that loses the claim to the webhook waits for it (see the
// same constant in lib/razorpay-fulfillment.ts).
const IN_PROGRESS_WAIT_MS = 15_000;
const IN_PROGRESS_POLL_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SubscriptionFulfilmentResult =
  | { kind: "fulfilled"; subscriptionId: string; expiryDate: Date; alreadyDone: boolean }
  | { kind: "unknown_order" }
  | { kind: "shop_mismatch" }
  | { kind: "previously_rejected" }
  | { kind: "second_payment" }
  | { kind: "payment_id_reused" }
  | { kind: "in_progress" }
  | { kind: "lookup_failed" }
  | { kind: "not_captured" }
  | { kind: "order_id_mismatch" }
  | { kind: "amount_mismatch" };

export interface FulfilSubscriptionCheckoutParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  source: "verify" | "webhook";
  /** Browser path: the session vendor's shop, which must own the checkout. */
  expectedShopId?: string;
}

export async function fulfilSubscriptionCheckout(
  params: FulfilSubscriptionCheckoutParams
): Promise<SubscriptionFulfilmentResult> {
  const { razorpayOrderId, razorpayPaymentId, source, expectedShopId } = params;
  const logCtx: Record<string, unknown> = { source, razorpayOrderId, razorpayPaymentId };

  await connectDB();
  const checkout = await SubscriptionCheckout.findOne({ razorpayOrderId });
  if (!checkout) return { kind: "unknown_order" };
  const shopId = String(checkout.shopId);
  logCtx.shopId = shopId;

  if (expectedShopId !== undefined && expectedShopId !== shopId) {
    console.error("[Razorpay subscription] SHOP_MISMATCH", { ...logCtx, sessionShopId: expectedShopId });
    return { kind: "shop_mismatch" };
  }

  const alreadyDone = (doc: any): SubscriptionFulfilmentResult => {
    if (doc.razorpayPaymentId && doc.razorpayPaymentId !== razorpayPaymentId) {
      console.error("[Razorpay subscription] SECOND_PAYMENT_FOR_ORDER — refund the second payment", {
        ...logCtx,
        firstPaymentId: doc.razorpayPaymentId,
      });
      return { kind: "second_payment" };
    }
    return {
      kind: "fulfilled",
      subscriptionId: String(doc.subscriptionId ?? ""),
      expiryDate: doc.subscriptionExpiryDate,
      alreadyDone: true,
    };
  };

  if (checkout.status === "fulfilled") return alreadyDone(checkout);
  if (checkout.status === "rejected") return { kind: "previously_rejected" };

  let claimed;
  try {
    claimed = await SubscriptionCheckout.findOneAndUpdate(
      {
        _id: checkout._id,
        $or: [
          { status: "created" },
          { status: "processing", processingAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) } },
        ],
      },
      {
        $set: { status: "processing", processingAt: new Date(), razorpayPaymentId, lastPaymentId: razorpayPaymentId },
        $unset: { expiresAt: 1 },
      },
      { new: true }
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      console.error("[Razorpay subscription] PAYMENT_ID_REUSED", logCtx);
      return { kind: "payment_id_reused" };
    }
    throw err;
  }
  if (!claimed) {
    const deadline = source === "verify" ? Date.now() + IN_PROGRESS_WAIT_MS : 0;
    for (;;) {
      const latest = await SubscriptionCheckout.findById(checkout._id);
      if (latest?.status === "fulfilled") return alreadyDone(latest);
      if (latest?.status === "rejected") return { kind: "previously_rejected" };
      if (latest?.status !== "processing" || Date.now() >= deadline) {
        console.warn("[Razorpay subscription] IN_PROGRESS — checkout claimed by another request", {
          ...logCtx,
          status: latest?.status,
        });
        return { kind: "in_progress" };
      }
      await sleep(IN_PROGRESS_POLL_MS);
    }
  }

  const release = () =>
    SubscriptionCheckout.updateOne(
      { _id: claimed._id, status: "processing" },
      { $set: { status: "created" }, $unset: { processingAt: 1, razorpayPaymentId: 1 } }
    );
  const reject = (reason: string) =>
    SubscriptionCheckout.updateOne(
      { _id: claimed._id },
      { $set: { status: "rejected", rejectionReason: reason }, $unset: { processingAt: 1 } }
    );

  try {
    let payment: Awaited<ReturnType<typeof fetchRazorpayPayment>>;
    try {
      payment = await fetchRazorpayPayment(razorpayPaymentId);
      for (let i = 1; i < CAPTURE_POLL_ATTEMPTS && payment.status === "authorized"; i++) {
        await sleep(CAPTURE_POLL_DELAY_MS);
        payment = await fetchRazorpayPayment(razorpayPaymentId);
      }
    } catch (err) {
      console.error("[Razorpay subscription] PAYMENT_LOOKUP_FAILED", { ...logCtx, err });
      await release();
      return { kind: "lookup_failed" };
    }

    const gatewayCtx = {
      ...logCtx,
      expectedAmountMinor: claimed.amountMinor,
      expectedCurrency: claimed.currency,
      paidAmountMinor: payment.amount,
      paidCurrency: payment.currency,
      paymentStatus: payment.status,
      paymentOrderId: payment.orderId,
    };
    if (payment.orderId !== razorpayOrderId) {
      console.error("[Razorpay subscription] ORDER_ID_MISMATCH", gatewayCtx);
      await reject("order_id_mismatch");
      return { kind: "order_id_mismatch" };
    }
    if (payment.status !== "captured") {
      console.error("[Razorpay subscription] NOT_CAPTURED", gatewayCtx);
      await release();
      return { kind: "not_captured" };
    }
    if (payment.amount !== claimed.amountMinor || payment.currency !== claimed.currency) {
      console.error("[Razorpay subscription] AMOUNT_MISMATCH", gatewayCtx);
      await reject("amount_mismatch");
      return { kind: "amount_mismatch" };
    }

    const result = await fulfillSubscriptionPayment({
      shopId,
      gateway: { paymentMethod: "razorpay", gatewayOrderId: razorpayOrderId, gatewayPaymentId: razorpayPaymentId },
      // This checkout record proves the order belongs to this shop, even if
      // a later create-order has since replaced VendorSubscription.razorpayOrderId.
      checkoutVerified: true,
    });

    await SubscriptionCheckout.updateOne(
      { _id: claimed._id },
      {
        $set: { status: "fulfilled", subscriptionId: result.subscriptionId, subscriptionExpiryDate: result.expiryDate },
        $unset: { processingAt: 1 },
      }
    );
    return { kind: "fulfilled", subscriptionId: result.subscriptionId, expiryDate: result.expiryDate, alreadyDone: result.alreadyProcessed };
  } catch (err) {
    console.error("[Razorpay subscription] FULFILMENT_ERROR — claim released for retry", { ...logCtx, err });
    await release().catch(() => {});
    throw err;
  }
}
