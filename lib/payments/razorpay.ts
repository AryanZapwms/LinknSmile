// lib/payments/razorpay.ts
//
// Wrapper extraction of the Razorpay logic that used to live inline in
// app/api/razorpay/create-order and app/api/razorpay/verify-payment — NOT
// a rewrite. Behavior is deliberately identical to before this file
// existed, including keeping the plain `!==` signature comparison (a
// known, audit-flagged timing side-channel — NOT fixed here, since fixing
// it wasn't in scope and this file must not change Razorpay's behavior).
// The new Tap adapter (lib/payments/tap.ts) uses crypto.timingSafeEqual
// instead — that weakness just isn't copied into new code.

import Razorpay from "razorpay";
import crypto from "crypto";
import type {
  PaymentGatewayAdapter,
  CreatePaymentOrderParams,
  CreatePaymentOrderResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
} from "./types";
import { PaymentGatewayError } from "./types";

function getClient() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

async function createPaymentOrder(
  params: CreatePaymentOrderParams
): Promise<CreatePaymentOrderResult> {
  const razorpay = getClient();
  const order = await razorpay.orders.create({
    amount: Math.round(params.amount * 100), // paise — smallest currency unit, computed server-side
    currency: params.currency,
    payment_capture: true,
    ...(params.metadata ? { notes: params.metadata } : {}),
  });

  return {
    gatewayOrderId: order.id,
    amount: typeof order.amount === "number" ? order.amount : Number(order.amount),
    currency: order.currency,
    checkoutMode: "widget",
  };
}

async function verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
  const { gatewayOrderId, gatewayPaymentId, signature } = params;
  if (!gatewayOrderId || !gatewayPaymentId || !signature) {
    throw new PaymentGatewayError("Missing payment details", 400);
  }

  const body = gatewayOrderId + "|" + gatewayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");

  // Deliberately unchanged: plain !== comparison, matching the pre-existing
  // behavior exactly (see file header).
  if (expectedSignature !== signature) {
    throw new PaymentGatewayError("Invalid signature", 400);
  }

  return {
    success: true,
    gatewayOrderId,
    gatewayPaymentId,
    // Razorpay's widget callback doesn't return amount/currency — callers
    // already have the authoritative amount from computeOrderPricing().
    amount: 0,
    currency: "",
  };
}

/**
 * Read-only lookup of a payment as Razorpay records it — used by
 * verify-payment to confirm the amount/currency/order actually captured,
 * since the widget callback's signature alone doesn't prove any amount.
 * `amount` is in minor units (paise), exactly as Razorpay returns it.
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<{
  id: string;
  orderId: string | null;
  status: string;
  amount: number;
  currency: string;
}> {
  const payment = await getClient().payments.fetch(paymentId);
  return {
    id: payment.id,
    orderId: payment.order_id ?? null,
    status: payment.status,
    amount: typeof payment.amount === "number" ? payment.amount : Number(payment.amount),
    currency: payment.currency,
  };
}

export const razorpayAdapter: PaymentGatewayAdapter = {
  name: "razorpay",
  checkoutMode: "widget",
  createPaymentOrder,
  verifyPayment,
};
