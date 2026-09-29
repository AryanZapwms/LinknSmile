// app/api/orders/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { Cart } from "@/lib/models/cart";
import Shop from "@/lib/models/shop";
import { sendEmail } from "@/lib/email";
import { sendPushNotificationToMultipleVendors } from "@/lib/services/push-notification";
import { reserveStock } from "@/lib/stock-reservation";
import { computeOrderPricing, PricingError } from "@/lib/pricing";
import { PLATFORM_SHOP_ID } from "@/lib/constants";
import { formatCurrency } from "@/lib/currency";
import { escapeHtml } from "@/lib/escape-html";


   

// Helper function to generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return withCORS(
        NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 })
      );
    }

    await connectDB();

    // Idempotency check for COD orders
    const idempotencyKey = req.headers.get("X-Idempotency-Key");
    if (idempotencyKey) {
      const existingOrder = (await Order.findOne({ idempotencyKey }).lean()) as any;
      if (existingOrder) {
        return withCORS(
          NextResponse.json({
            success: true,
            orderId: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
            message: "Order already exists",
          })
        );
      }
    }

    const body = await req.json();
    // paymentStatus / razorpayOrderId / razorpayPaymentId are deliberately NOT
    // read from the body. This route only creates unpaid COD orders — paid
    // orders are created exclusively by fulfillPaidOrder() (lib/order-fulfillment.ts)
    // after a gateway route has verified the payment.
    const { items, shippingAddress, couponCode } = body;

    if (body.paymentMethod !== undefined && body.paymentMethod !== "cod") {
      return withCORS(
        NextResponse.json(
          { error: "This endpoint only accepts cash on delivery orders" },
          { status: 400 }
        )
      );
    }
    const paymentMethod = "cod";
    const paymentStatus = "pending";

    // Validate required fields
    if (!items || items.length === 0) {
      return withCORS(NextResponse.json({ error: "No items in order" }, { status: 400 }));
    }

    if (!shippingAddress) {
      return withCORS(
        NextResponse.json({ error: "Shipping address is required" }, { status: 400 })
      );
    }

    // Compute authoritative pricing from the database (ignores client-sent prices)
    const {
      processedItems,
      vendorPayouts,
      totalAmount: computedTotal,
      appliedCoupon,
      taxRatePercent,
      taxAmount,
    } = await computeOrderPricing(items, {
      couponCode: couponCode || undefined,
      userId: session.user.id,
    });

    // ✅ Atomically reserve stock for all items upfront (prevents overselling)
    const reservation = await reserveStock(
      items.map((item: any) => ({
        productId: item.product,
        quantity: item.quantity,
        selectedSize: item.selectedSize ?? null,
      }))
    );

    if (!reservation.success) {
      return withCORS(
        NextResponse.json(
          {
            error: `Insufficient stock for "${reservation.failedProduct}". Please update your cart.`,
          },
          { status: 400 }
        )
      );
    }





    // Create order
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      idempotencyKey: idempotencyKey || null,
      user: session.user.id,
      items: processedItems,
      totalAmount: computedTotal,
      taxRatePercent,
      taxAmount,
      appliedCoupon: appliedCoupon
        ? {
            code: appliedCoupon.code,
            shopId: appliedCoupon.shopId,
            discountAmount: appliedCoupon.discountAmount,
          }
        : undefined,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      orderStatus: "pending",
      vendorPayouts: Object.values(vendorPayouts).map((v) => ({
        shopId: v.shopId,
        amount: v.amount,
        status: "held",
      })),
    });

    // Redeem the coupon now that the order is actually committed — COD
    // orders count as "completed" here regardless of paymentStatus, since
    // stock was already hard-reserved above and the order is real, not a
    // preview. Best-effort, matching the ledger-recording pattern below.
    if (appliedCoupon) {
      try {
        const { redeemCoupon } = await import("@/lib/coupon-pricing");
        await redeemCoupon(appliedCoupon.shopId, appliedCoupon.code);
      } catch (couponError) {
        console.error("[Orders] Coupon redemption failed for order", order._id, couponError);
      }
    }

    // No LedgerService.recordSale here: COD orders are unpaid at creation.
    // Vendor wallets are only credited for gateway-verified payments, via
    // fulfillPaidOrder() in lib/order-fulfillment.ts.

    // NOTE: Stock was already decremented atomically by reserveStock() above.
    // No separate stock update loop needed here.

    // Update shop stats for each vendor
    for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
      if (shopId !== PLATFORM_SHOP_ID) {
        await Shop.findByIdAndUpdate(shopId, {
          $inc: {
            "stats.totalOrders": 1,
            "stats.totalRevenue": payoutInfo.amount,
          },
        });
      }
    }

    // Clear the user's cart in DB
    try {
      await Cart.findOneAndUpdate(
        { userId: session.user.id },
        { items: [], $inc: { version: 1 } },
        { upsert: true }
      );
    } catch (cartError) {
      console.error("[Orders] Failed to clear cart:", cartError);
    }

    // Send emails
    try {
      await sendEmail({
        to: session.user.email || shippingAddress.email,
        subject: `Order Confirmation - ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Order Confirmed!</h1>
            <p>Thank you for your order. Your order number is: <strong>${orderNumber}</strong></p>
            <h2 style="color: #555; margin-top: 30px;">Order Details:</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${processedItems
                  .map((item) => {
                    return `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #ddd;">
                        ${escapeHtml(item.name || "Product")}
                        ${item.selectedSize ? `<br/><small>(${escapeHtml(item.selectedSize.size)})</small>` : ""}
                        <br/><small style="color: #888;">by ${escapeHtml(item.shopName)}</small>
                      </td>
                      <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${escapeHtml(item.quantity)}</td>
                      <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>Total:</strong></td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>${formatCurrency(computedTotal)}</strong></td>
                </tr>
              </tfoot>
            </table>
            <h2 style="color: #555; margin-top: 30px;">Shipping Address:</h2>
            <p>
              ${escapeHtml(shippingAddress.name)}<br/>
              ${escapeHtml(shippingAddress.street)}<br/>
              ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.state)} ${escapeHtml(shippingAddress.zipCode)}<br/>
              ${escapeHtml(shippingAddress.country)}<br/>
              Phone: ${escapeHtml(shippingAddress.phone)}
            </p>
            <p style="margin-top: 30px; color: #666;">
              Payment Method: <strong>${paymentMethod.toUpperCase()}</strong><br/>
              Payment Status: <strong>${paymentStatus || "Pending"}</strong>
            </p>
          </div>
        `,
      });

      const vendorShopIds = Object.keys(vendorPayouts).filter((id) => id !== "platform");
      if (vendorShopIds.length > 0) {
        const totalVendorEarnings = Object.values(vendorPayouts).reduce(
          (sum, v) => sum + v.amount,
          0
        );
        await sendPushNotificationToMultipleVendors(
          vendorShopIds,
          "🛍️ New Order Received!",
          `You have a new order #${orderNumber}. Total earnings: ${formatCurrency(totalVendorEarnings)}`,
          { screen: "orders", orderId: (order._id as any).toString() }
        );
      }

      for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
        if (shopId === PLATFORM_SHOP_ID) continue;
        const shop = (await Shop.findById(shopId)
          .populate("ownerId", "email name")
          .lean()) as any;
        if (shop && shop.ownerId) {
          await sendEmail({
            to: (shop.ownerId as any).email,
            subject: `New Order Received - ${orderNumber}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">New Order Received!</h1>
                <p>You have a new order for: <strong>${escapeHtml(shop.shopName)}</strong></p>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Your Earnings:</strong> ${formatCurrency(payoutInfo.amount)}</p>
                <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
                  <strong>Action Required:</strong> Please prepare the items for shipping.
                </p>
              </div>
            `,
          });
        }
      }

      if (process.env.ADMIN_EMAIL) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: `New Order - ${orderNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>New Order Received</h2>
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Total Amount:</strong> ${formatCurrency(computedTotal)}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              <p><strong>Payment Status:</strong> ${paymentStatus || "Pending"}</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return withCORS(
      NextResponse.json({
        success: true,
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Order created successfully",
      })
    );
  } catch (error: any) {
    if (error instanceof PricingError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Order creation error:", error);
    return withCORS(NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 }));
  }
}

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const orders = (await Order.find({ user: session.user.id })
      .populate("items.product", "name image slug")
      .sort({ createdAt: -1 })
      .lean()) as any;

    const { searchParams } = new URL(req.url);
    if (searchParams.get("userOrders") === "true") {
      return withCORS(NextResponse.json(orders));
    }

    return withCORS(NextResponse.json({ orders }));
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 }));
  }
}