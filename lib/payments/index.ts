// lib/payments/index.ts
//
// Single entry point for "which payment gateway is this deployment
// running" — selection is driven by PAYMENT_GATEWAY (lib/env.ts),
// defaulting to "razorpay" so existing deployments are unaffected.

import { razorpayAdapter } from "./razorpay";
import { tapAdapter } from "./tap";
import type { PaymentGatewayAdapter } from "./types";

const adapters: Record<string, PaymentGatewayAdapter> = {
  razorpay: razorpayAdapter,
  tap: tapAdapter,
};

export function getPaymentGateway(): PaymentGatewayAdapter {
  const gateway = process.env.PAYMENT_GATEWAY || "razorpay";
  const adapter = adapters[gateway];
  if (!adapter) {
    throw new Error(`Unknown PAYMENT_GATEWAY "${gateway}". Supported: ${Object.keys(adapters).join(", ")}`);
  }
  return adapter;
}

export * from "./types";
