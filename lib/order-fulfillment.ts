// lib/order-fulfillment.ts
//
// Shared post-payment orchestration, extracted from what used to be
// inline in app/api/razorpay/verify-payment/route.ts — a wrapper
// extraction (same as lib/payments/razorpay.ts), not a rewrite. Both the
// Razorpay and Tap verify-payment routes (and Tap's webhook) call this
// with a gatewayInfo discriminator instead of each reimplementing pricing
// recomputation, coupon redemption, stock decrement, ledger recording,
// and email sending. computeOrderPricing()/coupon logic itself is
// untouched — this only orchestrates around it, per the explicit
// requirement that the gateway layer must not change that logic.

import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Cart } from "@/lib/models/cart";
import Shop from "@/lib/models/shop";
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email";
import { computeOrderPricing, PricingError, type CartItemInput } from "@/lib/pricing";
import { formatCurrency, LOCALE } from "@/lib/currency";
import { safeDecrementStock } from "@/lib/stock-safe-decrement";
import { PLATFORM_SHOP_ID } from "@/lib/constants";

export interface GatewayInfo {
  paymentMethod: "razorpay" | "tap";
  gatewayOrderId: string;
  gatewayPaymentId: string;
}

export interface FulfillPaidOrderParams {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  items: CartItemInput[];
  shippingAddress: any;
  couponCode?: string;
  gateway: GatewayInfo;
}

export interface FulfillPaidOrderResult {
  orderId: string;
  alreadyProcessed: boolean;
}

/**
 * Idempotency check, shared across gateways. Razorpay orders are looked
 * up by the frozen razorpayPaymentId field (unchanged behavior); every
 * other gateway (Tap, and any future one) by the generic gatewayPaymentId
 * field — see lib/models/order.ts for why these aren't unified.
 */
async function findExistingOrder(gateway: GatewayInfo) {
  if (gateway.paymentMethod === "razorpay") {
    return Order.findOne({ razorpayPaymentId: gateway.gatewayPaymentId });
  }
  return Order.findOne({ gatewayPaymentId: gateway.gatewayPaymentId, paymentGateway: gateway.paymentMethod });
}

export async function fulfillPaidOrder(
  params: FulfillPaidOrderParams
): Promise<FulfillPaidOrderResult> {
  const { userId, userEmail, userName, items, shippingAddress, couponCode, gateway } = params;

  await connectDB();

  const existing = await findExistingOrder(gateway);
  if (existing) {
    return { orderId: (existing._id as any).toString(), alreadyProcessed: true };
  }

  // Recompute pricing from the database — never trust client-sent prices/totals
  const { processedItems, vendorPayouts, totalAmount, appliedCoupon, taxRatePercent, taxAmount } =
    await computeOrderPricing(items, { couponCode: couponCode || undefined, userId });

  const orderNumber = `ORD-${Date.now()}`;
  const gatewayFields =
    gateway.paymentMethod === "razorpay"
      ? { razorpayOrderId: gateway.gatewayOrderId, razorpayPaymentId: gateway.gatewayPaymentId }
      : {
          paymentGateway: gateway.paymentMethod,
          gatewayOrderId: gateway.gatewayOrderId,
          gatewayPaymentId: gateway.gatewayPaymentId,
        };

  const order = await Order.create({
    orderNumber,
    user: userId,
    items: processedItems,
    totalAmount,
    taxRatePercent,
    taxAmount,
    appliedCoupon: appliedCoupon
      ? {
          code: appliedCoupon.code,
          shopId: appliedCoupon.shopId,
          discountAmount: appliedCoupon.discountAmount,
        }
      : undefined,
    shippingAddress: {
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      street: shippingAddress.street,
      address: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zipCode: shippingAddress.zipCode,
      pincode: shippingAddress.zipCode,
      country: shippingAddress.country,
    },
    paymentMethod: gateway.paymentMethod,
    paymentStatus: "completed",
    orderStatus: "processing",
    ...gatewayFields,
    vendorPayouts: Object.values(vendorPayouts).map((v) => ({
      shopId: v.shopId,
      amount: v.amount,
      status: "pending",
    })),
  });

  // Redeem the coupon now that the order is actually committed — never at
  // validation/preview time. Best-effort: an extremely rare lost race here
  // shouldn't roll back a real payment.
  if (appliedCoupon) {
    try {
      const { redeemCoupon } = await import("@/lib/coupon-pricing");
      await redeemCoupon(appliedCoupon.shopId, appliedCoupon.code);
    } catch (couponError) {
      console.error("Coupon redemption failed, but payment succeeded:", couponError);
    }
  }

  // Safely decrement stock (won't go negative; logs if something couldn't be reserved)
  const stockResults = await safeDecrementStock(processedItems);
  const oversold = stockResults.filter((r) => !r.ok);
  if (oversold.length > 0) {
    console.error(`[${gateway.paymentMethod}] Stock oversold after payment, needs manual review:`, {
      orderId: order._id,
      products: oversold.map((o) => o.product),
    });
  }

  // Update shop stats
  for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
    if (shopId !== PLATFORM_SHOP_ID) {
      await Shop.findByIdAndUpdate(shopId, {
        $inc: { "stats.totalOrders": 1, "stats.totalRevenue": payoutInfo.amount },
      });
    }
  }

  // Clear cart
  try {
    await Cart.findOneAndUpdate({ userId }, { items: [], $inc: { version: 1 } }, { upsert: true });
  } catch (cartError) {
    console.error(`[${gateway.paymentMethod}] Failed to clear cart:`, cartError);
  }

  // Ledger
  try {
    const ledgerItems = processedItems.map((item) => ({
      shopId: item.shopId.toString(),
      vendorEarnings: item.vendorEarnings,
      commission: item.platformCommission,
    }));
    const { LedgerService } = await import("@/lib/services/ledger-service");
    await LedgerService.recordSale({ orderId: (order._id as any).toString(), items: ledgerItems });
  } catch (ledgerError) {
    console.error("Ledger recording failed, but payment succeeded:", ledgerError);
  }

  // Emails (best-effort, never block the response)
  try {
    const orderDate = new Date(order.createdAt).toLocaleDateString(LOCALE, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const mappedAddress = {
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      street: shippingAddress.street,
      address: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zipCode: shippingAddress.zipCode,
      pincode: shippingAddress.zipCode,
      country: shippingAddress.country,
    };

    const itemsData = processedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      selectedSize: item.selectedSize,
      shopName: item.shopName,
    }));

    await sendEmail({
      to: userEmail!,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: getOrderConfirmationEmail({
        orderId: order.orderNumber,
        customerName: userName || "Customer",
        items: itemsData,
        total: order.totalAmount,
        orderDate,
        paymentStatus: "completed",
      }),
    });

    await sendEmail({
      to: process.env.GMAIL_EMAIL || "instapeels@gmail.com",
      subject: `🚨 NEW ORDER - ${order.orderNumber}`,
      html: getAdminOrderNotificationEmail({
        customerName: userName || "Customer",
        customerEmail: userEmail || "",
        customerPhone: "N/A",
        orderId: order.orderNumber,
        items: itemsData,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        shippingAddress: mappedAddress,
        orderDate,
      }),
    });

    for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
      if (shopId === PLATFORM_SHOP_ID) continue;

      const shop = (await Shop.findById(shopId).populate("ownerId", "email name").lean()) as any;
      if (shop?.ownerId) {
        const vendorEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">🎉 New Paid Order Received!</h1>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 16px;"><strong>Shop:</strong> ${payoutInfo.shopName}</p>
              <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>Payment:</strong> <span style="color: #16a34a;">✓ Completed</span></p>
            </div>
            <h2 style="color: #334155; margin-top: 30px;">Your Items:</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead><tr style="background: #f1f5f9;">
                <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Product</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">Qty</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Your Earnings</th>
              </tr></thead>
              <tbody>
                ${payoutInfo.items
                  .map(
                    (item) => `
                  <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${item.productName}</td>
                    <td style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: 600;">${formatCurrency(item.earnings)}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
              <tfoot><tr style="background: #ecfdf5;">
                <td colspan="2" style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold;">Total Earnings:</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: #16a34a; font-size: 18px;">${formatCurrency(payoutInfo.amount)}</td>
              </tr></tfoot>
            </table>
            <h2 style="color: #334155; margin-top: 30px;">Shipping Address:</h2>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; line-height: 1.6;">
                <strong>${shippingAddress.name}</strong><br/>
                ${shippingAddress.street}<br/>
                ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br/>
                <strong>Phone:</strong> ${shippingAddress.phone}
              </p>
            </div>
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #2563eb;">
              <p style="margin: 0; font-weight: 600; color: #1e40af;">📦 Action Required: Please prepare these items for shipping</p>
            </div>
          </div>
        `;
        await sendEmail({
          to: (shop.ownerId as any).email,
          subject: `🎉 New Paid Order - ${order.orderNumber} - ${payoutInfo.shopName}`,
          html: vendorEmailHtml,
        });
      }
    }
  } catch (emailError) {
    console.error("Failed to send order emails:", emailError);
  }

  return { orderId: (order._id as any).toString(), alreadyProcessed: false };
}

export { PricingError };
