// lib/payment-settings.ts
//
// Server-side enforcement of the admin's payment toggles (PaymentSettings).
// The checkout UI hides a disabled method, but the order routes must refuse
// it too, or any API client could still use it. A missing settings document
// means "all enabled", matching the public settings route and the UI default.

import { connectDB } from "@/lib/db";
import { PaymentSettings } from "@/lib/models/payment-settings";
import { apiError } from "@/lib/api-error";

export type PaymentMethodToggle = "cod" | "razorpay";

const FIELD: Record<PaymentMethodToggle, "enableCOD" | "enableRazorpay"> = {
  cod: "enableCOD",
  razorpay: "enableRazorpay",
};

const MESSAGE: Record<PaymentMethodToggle, string> = {
  cod: "Cash on delivery is currently unavailable. Please choose another payment method.",
  razorpay: "Online payment is currently unavailable. Please choose another payment method.",
};

export async function isPaymentMethodEnabled(method: PaymentMethodToggle): Promise<boolean> {
  await connectDB();
  const settings = await PaymentSettings.findOne()
    .select("enableCOD enableRazorpay")
    .lean<{ enableCOD?: boolean; enableRazorpay?: boolean }>();
  return settings?.[FIELD[method]] !== false;
}

/** A 403 PAYMENT_METHOD_DISABLED response when the method is off, else null. */
export async function rejectIfPaymentMethodDisabled(method: PaymentMethodToggle) {
  if (await isPaymentMethodEnabled(method)) return null;
  return apiError("PAYMENT_METHOD_DISABLED", MESSAGE[method], 403, { paymentMethod: method });
}
