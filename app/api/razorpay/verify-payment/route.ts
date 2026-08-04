import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Cart } from "@/lib/models/cart";
import Shop from "@/lib/models/shop";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email";
import { paymentLimiter } from "@/lib/rate-limit";
import { computeOrderPricing, PricingError } from "@/lib/pricing";
import { safeDecrementStock } from "@/lib/stock-safe-decrement";
import { PLATFORM_SHOP_ID } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = paymentLimiter(ip);
  if (!success) {
    return Response.json(
      { error: "Too many requests. Please wait a minute before trying again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, items, shippingAddress } =
      await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return withCORS(NextResponse.json({ error: "Missing payment details" }, { status: 400 }));
    }
    if (!Array.isArray(items) || items.length === 0) {
      return withCORS(NextResponse.json({ error: "No items in order" }, { status: 400 }));
    }
    if (!shippingAddress) {
      return withCORS(NextResponse.json({ error: "Shipping address is required" }, { status: 400 }));
    }

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return withCORS(NextResponse.json({ error: "Invalid signature" }, { status: 400 }));
    }

    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name;

    // Idempotency: don't double-process the same payment
    const existing = await Order.findOne({ razorpayPaymentId });
    if (existing) {
      return withCORS(NextResponse.json({ success: true, orderId: existing._id }));
    }

    // Recompute pricing from the database — never trust client-sent prices/totals
    const { processedItems, vendorPayouts, totalAmount } = await computeOrderPricing(items);

      console.log("[DEBUG] computeOrderPricing result:", {
      totalAmount,
      totalAmountType: typeof totalAmount,
      itemCount: processedItems.length,
    });
    
    const orderNumber = `ORD-${Date.now()}`;
    const order = await Order.create({
      orderNumber,
      user: userId,
      items: processedItems,
      totalAmount, // ✅ fixed: was missing before, causing every order to fail
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
      paymentMethod: "razorpay",
      paymentStatus: "completed",
      orderStatus: "processing",
      razorpayOrderId,
      razorpayPaymentId,
      vendorPayouts: Object.values(vendorPayouts).map((v) => ({
        shopId: v.shopId,
        amount: v.amount,
        status: "pending",
      })),
    });

    // Safely decrement stock (won't go negative; logs if something couldn't be reserved)
    const stockResults = await safeDecrementStock(processedItems);
    const oversold = stockResults.filter((r) => !r.ok);
    if (oversold.length > 0) {
      console.error("[Razorpay] Stock oversold after payment, needs manual review:", {
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
      console.error("[Razorpay] Failed to clear cart:", cartError);
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
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
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
                      <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: 600;">₹${item.earnings.toFixed(2)}</td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
                <tfoot><tr style="background: #ecfdf5;">
                  <td colspan="2" style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold;">Total Earnings:</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: #16a34a; font-size: 18px;">₹${payoutInfo.amount.toFixed(2)}</td>
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

    return withCORS(NextResponse.json({ success: true, orderId: order._id }));
  } catch (error) {
    if (error instanceof PricingError) {
      return withCORS(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    console.error("Payment verification error:", error);
    return withCORS(NextResponse.json({ error: "Payment verification failed" }, { status: 500 }));
  }
}