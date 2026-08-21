// lib/subscription-fulfillment.ts
//
// Shared post-payment orchestration for vendor annual subscriptions,
// extracted from what used to be inline in
// app/api/vendor/subscription/verify-payment/route.ts — a wrapper
// extraction, not a rewrite. Mirrors lib/order-fulfillment.ts's role for
// the checkout flow.

import { connectDB } from "@/lib/db";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import Shop from "@/lib/models/shop";
import { Product } from "@/lib/models/product";
import {
  sendEmail,
  getVendorSubscriptionPaymentEmail,
  getAdminVendorSubscriptionPaidEmail,
} from "@/lib/email";
import type { GatewayInfo } from "@/lib/order-fulfillment";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface FulfillSubscriptionParams {
  shopId: string;
  gateway: GatewayInfo;
}

export interface FulfillSubscriptionResult {
  subscriptionId: string;
  expiryDate: Date;
  alreadyProcessed: boolean;
}

export async function fulfillSubscriptionPayment(
  params: FulfillSubscriptionParams
): Promise<FulfillSubscriptionResult> {
  const { shopId, gateway } = params;

  await connectDB();

  const subscription = await VendorSubscription.findOne({ shopId });
  if (
    !subscription ||
    (gateway.paymentMethod === "razorpay"
      ? subscription.razorpayOrderId !== gateway.gatewayOrderId
      : subscription.gatewayOrderId !== gateway.gatewayOrderId)
  ) {
    throw new Error("No matching subscription order found");
  }

  // Idempotency: don't double-process the same payment
  const alreadyProcessed = subscription.paymentHistory.some((p) =>
    gateway.paymentMethod === "razorpay"
      ? p.razorpayPaymentId === gateway.gatewayPaymentId
      : p.gatewayPaymentId === gateway.gatewayPaymentId
  );
  if (alreadyProcessed) {
    return {
      subscriptionId: (subscription._id as any).toString(),
      expiryDate: subscription.expiryDate!,
      alreadyProcessed: true,
    };
  }

  const now = new Date();
  const hasRemainingTime =
    subscription.status === "active" && subscription.expiryDate && subscription.expiryDate > now;

  const startDate = hasRemainingTime ? subscription.startDate! : now;
  const expiryBase = hasRemainingTime ? subscription.expiryDate!.getTime() : now.getTime();
  const expiryDate = new Date(expiryBase + ONE_YEAR_MS);

  subscription.status = "active";
  subscription.startDate = startDate;
  subscription.expiryDate = expiryDate;
  subscription.cancelledAt = undefined;
  subscription.cancelledBy = undefined;
  subscription.cancellationReason = undefined;

  const historyEntry: any = {
    amount: subscription.amount,
    paidAt: now,
    status: "success",
  };
  if (gateway.paymentMethod === "razorpay") {
    subscription.razorpayPaymentId = gateway.gatewayPaymentId;
    historyEntry.razorpayOrderId = gateway.gatewayOrderId;
    historyEntry.razorpayPaymentId = gateway.gatewayPaymentId;
  } else {
    subscription.gatewayPaymentId = gateway.gatewayPaymentId;
    historyEntry.paymentGateway = gateway.paymentMethod;
    historyEntry.gatewayOrderId = gateway.gatewayOrderId;
    historyEntry.gatewayPaymentId = gateway.gatewayPaymentId;
  }
  subscription.paymentHistory.push(historyEntry);
  await subscription.save();

  // Renewal reactivates any storefront-hidden products immediately —
  // don't make the vendor wait for the next cron run.
  await Product.updateMany({ shopId, hiddenBySubscription: true }, { hiddenBySubscription: false });

  const shop = await Shop.findById(shopId).populate("ownerId", "name email").lean<any>();
  const ownerEmail = shop?.ownerId?.email;
  const ownerName = shop?.ownerId?.name || "Vendor";
  const shopName = shop?.shopName || "Your shop";

  try {
    if (ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        subject: `Subscription Confirmed - ${shopName}`,
        html: getVendorSubscriptionPaymentEmail({
          vendorName: ownerName,
          shopName,
          amount: subscription.amount,
          expiryDate,
        }),
      });
    }
    await sendEmail({
      to: process.env.GMAIL_EMAIL || "instapeels@gmail.com",
      subject: `Vendor Subscription Paid - ${shopName}`,
      html: getAdminVendorSubscriptionPaidEmail({
        shopName,
        ownerName,
        ownerEmail: ownerEmail || "",
        amount: subscription.amount,
        expiryDate,
      }),
    });
  } catch (emailError) {
    console.error("Failed to send subscription emails:", emailError);
  }

  return {
    subscriptionId: (subscription._id as any).toString(),
    expiryDate,
    alreadyProcessed: false,
  };
}
