// lib/payments/tap.ts
//
// Tap Payments (developers.tap.company) adapter. Verified against Tap's
// real docs before writing this (not guessed from general payment-gateway
// knowledge) — see PROJECT_SOURCE_OF_TRUTH.md §16/§9 for citations and
// what remains unverified without real sandbox credentials.
//
// Key differences from Razorpay this file has to account for:
// - Checkout is a server-driven HOSTED REDIRECT, not a client-side widget
//   popup: create a charge, get back `transaction.url`, do a full-page
//   navigation there. No client-side Tap SDK, no public/publishable key —
//   only a server-side secret key.
// - Because the browser fully navigates away and back (via `redirect.url`
//   + a `?tap_id=` query param), any per-checkout state that isn't in the
//   DB/cart (shippingAddress, couponCode) has to survive that round trip
//   some other way — done here via Tap's `metadata` field, which Tap
//   echoes back verbatim on retrieve-charge.
// - Amounts are the charge's major currency unit (e.g. "10.50" AED), not
//   an integer smallest-unit like Razorpay's paise — and per Tap's own
//   docs, must be formatted to that currency's correct number of decimal
//   places (2 for AED/SAR/QAR/USD/EUR/GBP, 3 for KWD/BHD/OMR) for both the
//   charge request and the webhook signature check below.
// - Signature verification uses crypto.timingSafeEqual, not the plain
//   `!==` the existing Razorpay code uses (audit-flagged timing
//   side-channel) — not copying that weakness into new code, per explicit
//   instruction.

import crypto from "crypto";
import type {
  PaymentGatewayAdapter,
  CreatePaymentOrderParams,
  CreatePaymentOrderResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
} from "./types";
import { PaymentGatewayError } from "./types";

const TAP_API_BASE = "https://api.tap.company/v2";

// ISO 4217 currencies with 3 decimal places, among the ones Tap supports
// (AED/BHD/EUR/GBP/KWD/OMR/QAR/SAR/USD) — everything else in that list is 2.
const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR"]);

function decimalsFor(currency: string): number {
  return THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 3 : 2;
}

function formatAmount(amount: number, currency: string): string {
  return amount.toFixed(decimalsFor(currency));
}

function authHeaders() {
  const secretKey = process.env.TAP_SECRET_KEY;
  if (!secretKey) {
    throw new PaymentGatewayError("Tap is not configured (TAP_SECRET_KEY missing)", 500);
  }
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

interface TapCharge {
  id: string;
  status: string;
  amount: number;
  currency: string;
  transaction?: { url?: string; created?: string | number };
  reference?: { gateway?: string; payment?: string; order?: string };
  metadata?: Record<string, string>;
}

async function createPaymentOrder(
  params: CreatePaymentOrderParams
): Promise<CreatePaymentOrderResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (!siteUrl) {
    throw new PaymentGatewayError("Site URL not configured — required for Tap redirect", 500);
  }

  const body = {
    amount: Number(formatAmount(params.amount, params.currency)),
    currency: params.currency.toUpperCase(),
    customer_initiated: true,
    threeDSecure: true,
    save_card: false,
    description: params.reference || "LinknSmile order",
    // Lets Tap host card collection on its own hosted page — we never
    // handle card details directly, so no client-side tokenization SDK
    // is needed for this flow.
    source: { id: "src_card" },
    redirect: { url: `${siteUrl}${params.redirectPath || "/checkout/tap-return"}` },
    post: { url: `${siteUrl}${params.webhookPath || "/api/tap/webhook"}` },
    reference: params.reference ? { order: params.reference } : undefined,
    metadata: params.metadata,
  };

  const res = await fetch(`${TAP_API_BASE}/charges/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as TapCharge & { errors?: { code: string; description: string }[] };
  if (!res.ok || data.errors) {
    const message = data.errors?.[0]?.description || "Failed to create Tap charge";
    throw new PaymentGatewayError(message, res.status || 502);
  }

  if (!data.transaction?.url) {
    throw new PaymentGatewayError("Tap did not return a checkout URL", 502);
  }

  return {
    gatewayOrderId: data.id,
    amount: data.amount,
    currency: data.currency,
    checkoutMode: "redirect",
    redirectUrl: data.transaction.url,
  };
}

async function retrieveCharge(chargeId: string): Promise<TapCharge> {
  const res = await fetch(`${TAP_API_BASE}/charges/${chargeId}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const data = (await res.json()) as TapCharge & { errors?: { code: string; description: string }[] };
  if (!res.ok || data.errors) {
    const message = data.errors?.[0]?.description || "Failed to retrieve Tap charge";
    throw new PaymentGatewayError(message, res.status || 502);
  }
  return data;
}

async function verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
  if (!params.chargeId) {
    throw new PaymentGatewayError("Missing Tap charge ID", 400);
  }

  const charge = await retrieveCharge(params.chargeId);

  // Per Tap's documented status enum: INITIATED, ABANDONED, CANCELLED,
  // FAILED, DECLINED, RESTRICTED, AUTHORIZED, CAPTURED, VOID, TIMEDOUT,
  // UNKNOWN. Only CAPTURED means the money actually moved.
  if (charge.status !== "CAPTURED") {
    return {
      success: false,
      gatewayOrderId: charge.id,
      gatewayPaymentId: charge.id,
      amount: charge.amount,
      currency: charge.currency,
      metadata: charge.metadata,
    };
  }

  return {
    success: true,
    gatewayOrderId: charge.id,
    gatewayPaymentId: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    metadata: charge.metadata,
  };
}

/**
 * Verifies a Tap webhook's `hashstring` header. Algorithm confirmed from
 * Tap's own docs (developers.tap.company/docs/webhook) — NOT the simpler
 * "hash the raw JSON body" pattern that appears in some unofficial
 * tutorials, which conflicts with Tap's documented (and code-sampled)
 * approach and was not used here. Uses crypto.timingSafeEqual, not `!==`.
 */
export function verifyTapWebhookSignature(payload: TapCharge, hashstringHeader: string | null): boolean {
  if (!hashstringHeader) return false;
  const secretKey = process.env.TAP_SECRET_KEY;
  if (!secretKey) return false;

  const created = payload.transaction?.created ?? "";
  const toBeHashed =
    "x_id" +
    payload.id +
    "x_amount" +
    formatAmount(payload.amount, payload.currency) +
    "x_currency" +
    payload.currency +
    "x_gateway_reference" +
    (payload.reference?.gateway ?? "") +
    "x_payment_reference" +
    (payload.reference?.payment ?? "") +
    "x_status" +
    payload.status +
    "x_created" +
    created;

  const expected = crypto.createHmac("sha256", secretKey).update(toBeHashed).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(hashstringHeader, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export const tapAdapter: PaymentGatewayAdapter = {
  name: "tap",
  checkoutMode: "redirect",
  createPaymentOrder,
  verifyPayment,
};

export { retrieveCharge as retrieveTapCharge };
export type { TapCharge };
