import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { User } from "@/lib/models/user";
import Shop from "@/lib/models/shop";
import { Cart } from "@/lib/models/cart";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email";
import { paymentLimiter } from "@/lib/rate-limit";
import { reserveStock } from "@/lib/stock-reservation";

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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, items, shippingAddress, totalAmount } =
      await request.json();

    // Verify Razorpay signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return withCORS(NextResponse.json({ error: "Invalid signature" }, { status: 400 }));
    }

    await connectDB();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return withCORS(NextResponse.json({ error: "User not found" }, { status: 404 }));
    }

    // Idempotency — check if this payment was already processed
    let existingOrder = await Order.findOne({ razorpayPaymentId });
    if (existingOrder) {
      return withCORS(NextResponse.json({ success: true, orderId: existingOrder._id }));
    }

    // Check if a pending order was already created via /api/orders
    existingOrder = await Order.findOne({
      user: user._id,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      totalAmount,
    }).sort({ createdAt: -1 });

    // Process items with vendor information
    const processedItems = [];
    const vendorPayouts: Record<
      string,
      { shopId: string; shopName: string; amount: number; items: any[] }
    > = {};

    for (const item of items) {
      const product = (await Product.findById(item.product)
        .populate("shopId", "shopName commissionRate")
        .lean()) as any;

      if (!product) {
        console.error(`Product ${item.product} not found`);
        continue;
      }

      const dbShopId = product.shopId?._id || product.shopId;
      if (!dbShopId) {
        console.error(`Product ${product.name} is missing a vendorId.`);
        continue;
      }

      const shopId = dbShopId.toString();
      const shopName = product.shopId?.shopName || "LinkAndSmile Platform";
      const commissionRate = product.shopId?.commissionRate ?? 10;
      const itemTotal = item.price * item.quantity;
      const platformCommission = (itemTotal * commissionRate) / 100;
      const vendorEarnings = itemTotal - platformCommission;

      processedItems.push({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        selectedSize: item.selectedSize,
        shopId: dbShopId,
        shopName,
        platformCommission,
        vendorEarnings,
        commissionRate,
      });

      if (!vendorPayouts[shopId]) {
        vendorPayouts[shopId] = { shopId: dbShopId, shopName, amount: 0, items: [] };
      }
      vendorPayouts[shopId].amount += vendorEarnings;
      vendorPayouts[shopId].items.push({
        productId: item.product,
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        earnings: vendorEarnings,
      });
    }

    let order;

    if (existingOrder) {
      // Order was pre-created — just update payment details
      // Stock was already reserved when the order was created via /api/orders
      order = await Order.findByIdAndUpdate(
        existingOrder._id,
        {
          razorpayOrderId,
          razorpayPaymentId,
          paymentStatus: "completed",
          orderStatus: "processing",
          items: processedItems,
          vendorPayouts: Object.values(vendorPayouts).map((v) => ({
            shopId: v.shopId,
            amount: v.amount,
            status: "pending",
          })),
        },
        { new: true }
      );
    } else {
      // No pre-created order — atomically reserve stock now
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
              error: `Insufficient stock for "${reservation.failedProduct}". Payment will be refunded if charged.`,
            },
            { status: 400 }
          )
        );
      }

      const orderNumber = `ORD-${Date.now()}`;
      order = await Order.create({
        orderNumber,
        user: user._id,
        items: processedItems,
        totalAmount,
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
    }

    // NOTE: Stock is handled by reserveStock() above.
    // No separate stock decrement loop needed here.

    // Update shop stats
    for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
      if (shopId !== "699942a5a2b407e83b6d9ea8") {
        await Shop.findByIdAndUpdate(shopId, {
          $inc: { "stats.totalOrders": 1, "stats.totalRevenue": payoutInfo.amount },
        });
      }
    }

    // Clear cart
    try {
      if (user?._id) {
        await Cart.findOneAndUpdate(
          { userId: user._id },
          { items: [], $inc: { version: 1 } },
          { upsert: true }
        );
      }
    } catch (cartError) {
      console.error("[Razorpay] Failed to clear cart:", cartError);
    }

    // Record in ledger
    try {
      const ledgerItems = processedItems.map((item) => ({
        shopId: item.shopId,
        vendorEarnings: item.vendorEarnings,
        commission: item.platformCommission,
      }));
      const { LedgerService } = await import("@/lib/services/ledger-service");
      await LedgerService.recordSale({
        orderId: (order._id as any).toString(),
        items: ledgerItems,
      });
    } catch (ledgerError) {
      console.error("Ledger recording failed, but payment succeeded:", ledgerError);
    }

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

    // Send emails
    try {
      const populatedOrder = (await Order.findById(order._id)
        .populate("items.product")
        .lean()) as any;

      if (populatedOrder) {
        const itemsData = populatedOrder.items.map((item: any) => ({
          name: item.product?.name || "Product",
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize,
          shopName: item.shopName,
        }));

        const confirmationEmailHtml = getOrderConfirmationEmail({
          orderId: order.orderNumber,
          customerName: user.name,
          items: itemsData,
          total: order.totalAmount,
          orderDate,
          paymentStatus: "completed",
        });

        await sendEmail({
          to: user.email,
          subject: `Order Confirmation - ${order.orderNumber}`,
          html: confirmationEmailHtml,
        });

        const adminEmailHtml = getAdminOrderNotificationEmail({
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone || "N/A",
          orderId: order.orderNumber,
          items: itemsData,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          shippingAddress: mappedAddress,
          orderDate,
        });

        await sendEmail({
          to: process.env.GMAIL_EMAIL || "instapeels@gmail.com",
          subject: `🚨 NEW ORDER - ${order.orderNumber}`,
          html: adminEmailHtml,
        });

        for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
          if (shopId === "platform") continue;
          const shop = (await Shop.findById(shopId)
            .populate("ownerId", "email name")
            .lean()) as any;
          if (shop && shop.ownerId) {
            await sendEmail({
              to: (shop.ownerId as any).email,
              subject: `🎉 New Paid Order - ${order.orderNumber} - ${payoutInfo.shopName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #2563eb;">🎉 New Paid Order Received!</h1>
                  <p><strong>Shop:</strong> ${payoutInfo.shopName}</p>
                  <p><strong>Order:</strong> ${order.orderNumber}</p>
                  <p><strong>Your Earnings:</strong> ₹${payoutInfo.amount.toFixed(2)}</p>
                  <p><strong>Shipping to:</strong> ${shippingAddress.name}, ${shippingAddress.city}</p>
                  <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <p style="margin: 0; font-weight: 600; color: #1e40af;">
                      📦 Please prepare these items for shipping.
                    </p>
                  </div>
                </div>
              `,
            });
          }
        }
      }
    } catch (emailError) {
      console.error("Failed to send order emails:", emailError);
    }

    return withCORS(NextResponse.json({ success: true, orderId: order._id }));
  } catch (error) {
    console.error("Payment verification error:", error);
    return withCORS(NextResponse.json({ error: "Payment verification failed" }, { status: 500 }));
  }
}