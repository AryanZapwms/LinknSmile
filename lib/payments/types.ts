// lib/payments/types.ts
//
// Gateway-agnostic payment interface. Both lib/payments/razorpay.ts and
// lib/payments/tap.ts implement this — see lib/payments/index.ts for how
// the active one is selected (driven by PAYMENT_GATEWAY, lib/env.ts).
//
// Scope is deliberately narrow: this layer only talks to the payment
// gateway (create a payable order/charge, verify a completed payment). It
// does NOT own pricing, coupons, stock, ledger, or email — callers compute
// pricing via computeOrderPricing() first (unchanged), then hand this
// layer just the resulting amount/currency. See lib/order-fulfillment.ts
// for the shared post-payment orchestration both gateways funnel into.

export interface CreatePaymentOrderParams {
  /** Major currency unit (e.g. rupees, dirhams) — NOT paise/fils/etc. */
  amount: number;
  currency: string;
  /** Internal reference shown in the gateway's dashboard, if it supports one. */
  reference?: string;
  /** Arbitrary key/value data the gateway should echo back on verification —
   *  used by the redirect-flow gateways (Tap) to survive a full-page
   *  navigation away from the checkout page. Widget-flow gateways
   *  (Razorpay) don't need this since the page never unloads. */
  metadata?: Record<string, string>;
  /** Redirect-flow gateways only (Tap): where to send the browser back to
   *  after checkout. Order checkout and vendor-subscription renewal use
   *  different return pages, so this isn't a single hardcoded constant —
   *  defaults to the order-checkout path if omitted. */
  redirectPath?: string;
  /** Redirect-flow gateways only (Tap): server-to-server confirmation
   *  endpoint for this specific flow (order vs subscription). Defaults to
   *  the order-checkout webhook if omitted. */
  webhookPath?: string;
}

export interface CreatePaymentOrderResult {
  /** The gateway's own order/charge ID (Razorpay: order.id, Tap: charge.id). */
  gatewayOrderId: string;
  /** Amount as the gateway echoes it back (for display only — never trust
   *  this for accounting, the server-computed amount is authoritative). */
  amount: number;
  currency: string;
  /** Tells the client which UI flow to run. */
  checkoutMode: "widget" | "redirect";
  /** Only set when checkoutMode is "redirect" (Tap: transaction.url). */
  redirectUrl?: string;
}

export interface VerifyPaymentParams {
  /** Razorpay widget callback fields. */
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  signature?: string;
  /** Tap redirect-return / webhook field — the charge ID. */
  chargeId?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  /** Gateway-specific metadata echoed back, if any was set at creation
   *  (see CreatePaymentOrderParams.metadata) — Tap only. */
  metadata?: Record<string, string>;
}

export interface PaymentGatewayAdapter {
  name: "razorpay" | "tap";
  checkoutMode: "widget" | "redirect";
  createPaymentOrder(params: CreatePaymentOrderParams): Promise<CreatePaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
}

// Client-safe mirror of the server-only PAYMENT_GATEWAY (lib/env.ts) —
// reads process.env directly rather than importing lib/env.ts, so this
// file stays safe to import from "use client" components (checkout page,
// vendor subscription renewal), same reasoning as lib/currency.ts.
export const ACTIVE_GATEWAY = (process.env.NEXT_PUBLIC_PAYMENT_GATEWAY || "razorpay") as
  | "razorpay"
  | "tap";

export class PaymentGatewayError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
