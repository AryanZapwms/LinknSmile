// lib/razorpay-fulfillment.ts
//
// Shared "turn a Razorpay payment into an Order" logic for both entry
// points: the browser callback (app/api/razorpay/verify-payment) and the
// server-to-server webhook (app/api/razorpay/webhook). Whichever arrives
// first does the work; the other gets the same orderId back or is told to
// retry. Callers must have authenticated the payment first (checkout
// signature or webhook signature).
//
// Steps: load the RazorpayCheckout written by create-order → atomic claim
// (created → processing) → confirm with Razorpay what was captured →
// fulfillPaidOrder from the STORED items/coupon/total → mark fulfilled.
//
// Log lines (REFUND_REQUIRED, NOT_CAPTURED, UNKNOWN_ORDER, …) are the ones
// described in docs/runbooks/razorpay-payment-alerts.md — keep them in sync.

import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { RazorpayCheckout } from "@/lib/models/razorpay-checkout";
import { fetchRazorpayPayment } from "@/lib/payments/razorpay";
import { fulfillPaidOrder, PricingError, AmountMismatchError } from "@/lib/order-fulfillment";

// A claim older than this is assumed to belong to a crashed request and
// may be taken over (fulfillPaidOrder still won't duplicate a created order).
const STALE_CLAIM_MS = 5 * 60 * 1000;
const CAPTURE_POLL_ATTEMPTS = 3;
const CAPTURE_POLL_DELAY_MS = 1500;
// Browser verify that loses the claim (usually to the payment.captured
// webhook, which fires at the same moment) waits this long for the winner
// to finish, so the customer gets their orderId instead of a 409.
const IN_PROGRESS_WAIT_MS = 15_000;
const IN_PROGRESS_POLL_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type RazorpayFulfilmentResult =
  | { kind: "fulfilled"; orderId: string; alreadyDone: boolean }
  | { kind: "unknown_order" }
  | { kind: "user_mismatch" }
  | { kind: "previously_rejected" }
  | { kind: "second_payment" }
  | { kind: "payment_id_reused" }
  | { kind: "in_progress" }
  | { kind: "lookup_failed" }
  | { kind: "not_captured" }
  | { kind: "order_id_mismatch" }
  | { kind: "amount_mismatch" }
  | { kind: "missing_address" }
  | { kind: "refund_required"; reason: string };

export interface FulfilRazorpayParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  source: "verify" | "webhook";
  /** Browser path: the session user, who must own the checkout. */
  expectedUserId?: string;
  /** Browser path: address from the request, used if none was stored at create-order. */
  shippingAddress?: unknown;
}

/**
 * Returns a result for every expected outcome. Throws only for unexpected
 * (transient) errors, after releasing its claim so a retry can proceed.
 */
export async function fulfilRazorpayCheckout(
  params: FulfilRazorpayParams
): Promise<RazorpayFulfilmentResult> {
  const { razorpayOrderId, razorpayPaymentId, source, expectedUserId } = params;
  const logCtx: Record<string, unknown> = { source, razorpayOrderId, razorpayPaymentId };

  await connectDB();

  const checkout = await RazorpayCheckout.findOne({ razorpayOrderId });
  if (!checkout) {
    console.error("[Razorpay] UNKNOWN_ORDER — no checkout record for this Razorpay order", logCtx);
    return { kind: "unknown_order" };
  }
  const userId = String(checkout.userId);
  logCtx.userId = userId;

  if (expectedUserId !== undefined && expectedUserId !== userId) {
    console.error("[Razorpay] USER_MISMATCH", { ...logCtx, sessionUserId: expectedUserId });
    return { kind: "user_mismatch" };
  }

  const alreadyDone = (doc: { razorpayPaymentId?: string; orderId?: unknown }): RazorpayFulfilmentResult => {
    if (doc.razorpayPaymentId && doc.razorpayPaymentId !== razorpayPaymentId) {
      console.error("[Razorpay] SECOND_PAYMENT_FOR_ORDER — refund the second payment", {
        ...logCtx,
        firstPaymentId: doc.razorpayPaymentId,
      });
      return { kind: "second_payment" };
    }
    return { kind: "fulfilled", orderId: String(doc.orderId), alreadyDone: true };
  };

  if (checkout.status === "fulfilled") return alreadyDone(checkout);
  if (checkout.status === "rejected") return { kind: "previously_rejected" };

  // Atomic claim: only one request at a time may fulfil this checkout.
  // Claiming also clears expiresAt, so a checkout that has seen a payment
  // is never removed by the TTL index (see lib/models/razorpay-checkout.ts).
  let claimed;
  try {
    claimed = await RazorpayCheckout.findOneAndUpdate(
      {
        _id: checkout._id,
        $or: [
          { status: "created" },
          { status: "processing", processingAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) } },
        ],
      },
      {
        $set: {
          status: "processing",
          processingAt: new Date(),
          razorpayPaymentId,
          lastPaymentId: razorpayPaymentId,
        },
        $unset: { expiresAt: 1 },
      },
      { new: true }
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      // Unique razorpayPaymentId: this payment is already bound to another checkout.
      console.error("[Razorpay] PAYMENT_ID_REUSED", logCtx);
      return { kind: "payment_id_reused" };
    }
    throw err;
  }
  if (!claimed) {
    // The webhook returns at once (Razorpay retries its 503); the browser
    // waits while the other claim is still processing.
    const deadline = source === "verify" ? Date.now() + IN_PROGRESS_WAIT_MS : 0;
    for (;;) {
      const latest = await RazorpayCheckout.findById(checkout._id);
      if (latest?.status === "fulfilled") return alreadyDone(latest);
      if (latest?.status === "rejected") return { kind: "previously_rejected" };
      if (latest?.status !== "processing" || Date.now() >= deadline) {
        console.warn("[Razorpay] IN_PROGRESS — checkout claimed by another request", {
          ...logCtx,
          status: latest?.status,
        });
        return { kind: "in_progress" };
      }
      await sleep(IN_PROGRESS_POLL_MS);
    }
  }

  const release = () =>
    RazorpayCheckout.updateOne(
      { _id: claimed._id, status: "processing" },
      { $set: { status: "created" }, $unset: { processingAt: 1, razorpayPaymentId: 1 } }
    );
  const reject = (reason: string) =>
    RazorpayCheckout.updateOne(
      { _id: claimed._id },
      { $set: { status: "rejected", rejectionReason: reason }, $unset: { processingAt: 1 } }
    );

  try {
    // Confirm with Razorpay what was actually captured. Orders are created
    // with payment_capture: true, so "authorized" is normally momentary.
    let payment: Awaited<ReturnType<typeof fetchRazorpayPayment>>;
    try {
      payment = await fetchRazorpayPayment(razorpayPaymentId);
      for (let i = 1; i < CAPTURE_POLL_ATTEMPTS && payment.status === "authorized"; i++) {
        await sleep(CAPTURE_POLL_DELAY_MS);
        payment = await fetchRazorpayPayment(razorpayPaymentId);
      }
    } catch (err) {
      console.error("[Razorpay] PAYMENT_LOOKUP_FAILED", { ...logCtx, err });
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
      console.error("[Razorpay] ORDER_ID_MISMATCH", gatewayCtx);
      await reject("order_id_mismatch");
      return { kind: "order_id_mismatch" };
    }
    if (payment.status !== "captured") {
      console.error("[Razorpay] NOT_CAPTURED", gatewayCtx);
      await release(); // allow a retry (browser or webhook) once Razorpay captures it
      return { kind: "not_captured" };
    }
    if (payment.amount !== claimed.amountMinor || payment.currency !== claimed.currency) {
      console.error("[Razorpay] AMOUNT_MISMATCH", gatewayCtx);
      await reject("amount_mismatch");
      return { kind: "amount_mismatch" };
    }

    const shippingAddress = hasAddress(claimed.shippingAddress)
      ? claimed.shippingAddress
      : params.shippingAddress;
    if (!hasAddress(shippingAddress)) {
      // Only possible for checkouts created before create-order stored the
      // address, reached via the webhook. The browser verify (which sends an
      // address) can still complete it, so release rather than reject.
      console.error("[Razorpay] MISSING_ADDRESS — captured payment has no stored shipping address", gatewayCtx);
      await release();
      return { kind: "missing_address" };
    }

    const buyer = await User.findById(userId)
      .select("email name")
      .lean<{ email?: string; name?: string }>();

    let orderId: string;
    try {
      ({ orderId } = await fulfillPaidOrder({
        userId,
        userEmail: buyer?.email,
        userName: buyer?.name,
        items: claimed.items.map((i: any) => ({
          product: i.product,
          quantity: i.quantity,
          selectedSize: i.selectedSize?.size
            ? { size: i.selectedSize.size, quantity: i.selectedSize.quantity }
            : undefined,
        })),
        shippingAddress,
        couponCode: claimed.couponCode || undefined,
        expectedTotal: claimed.amount,
        gateway: {
          paymentMethod: "razorpay",
          gatewayOrderId: razorpayOrderId,
          gatewayPaymentId: razorpayPaymentId,
        },
      }));
    } catch (err) {
      if (err instanceof AmountMismatchError || err instanceof PricingError) {
        // Money was captured but the cart can no longer be fulfilled at that
        // price (price/stock/coupon changed since create-order).
        const reason = err instanceof AmountMismatchError ? "price_changed" : "pricing_error";
        console.error("[Razorpay] REFUND_REQUIRED — captured payment could not be fulfilled", {
          ...gatewayCtx,
          reason,
          detail: err.message,
          ...(err instanceof AmountMismatchError
            ? { paidTotal: err.expected, recomputedTotal: err.computed }
            : {}),
        });
        await reject(reason);
        return { kind: "refund_required", reason };
      }
      throw err;
    }

    await RazorpayCheckout.updateOne(
      { _id: claimed._id },
      { $set: { status: "fulfilled", orderId }, $unset: { processingAt: 1 } }
    );
    return { kind: "fulfilled", orderId, alreadyDone: false };
  } catch (err) {
    // Unexpected failure: free the claim so the browser or a webhook retry can proceed.
    console.error("[Razorpay] FULFILMENT_ERROR — claim released for retry", { ...logCtx, err });
    await release().catch(() => {});
    throw err;
  }
}

function hasAddress(a: unknown): a is Record<string, unknown> {
  return !!a && typeof a === "object" && Object.keys(a as object).length > 0;
}

/** Keeps only the address fields fulfillPaidOrder uses, as strings. */
export function sanitizeShippingAddress(a: unknown): Record<string, string> | undefined {
  if (!a || typeof a !== "object") return undefined;
  const src = a as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of ["name", "phone", "email", "street", "city", "state", "zipCode", "country"]) {
    if (src[key] !== undefined && src[key] !== null) out[key] = String(src[key]).slice(0, 500);
  }
  return Object.keys(out).length ? out : undefined;
}
