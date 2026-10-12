// app/api/orders/[id]/route.ts
import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { User } from "@/lib/models/user";
import { type NextRequest, NextResponse } from "next/server";
import { sendEmail, getOrderStatusUpdateEmail } from "@/lib/email";
import { resolveEmailLocale } from "@/lib/email-locale";
import { sendPushNotificationToMultipleVendors } from "@/lib/services/push-notification";

import { Product } from "@/lib/models/product";
import { Company } from "@/lib/models/company";
import { getAuthSession } from "@/lib/get-auth-user";
import { statusChangeUpdate } from "@/lib/order-status-tracking";

void Product;
void Company;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { id } = await context.params;
    const session = await getAuthSession(request);
    if (!session?.user?.email) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return withCORS(NextResponse.json({ error: "User not found" }, { status: 404 }));
    }

    const order = await Order.findOne({ _id: id, user: user._id })
      .populate({
        path: "items.product",
        select: "name image slug",
        populate: { path: "company", select: "name slug" },
      })
      .lean() as any;

    if (!order) {
      return withCORS(NextResponse.json({ error: "Order not found" }, { status: 404 }));
    }

    // ❌ REMOVED: Do NOT send notifications on GET requests

    return withCORS(NextResponse.json(order));
  } catch (error) {
    console.error("Error fetching order:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch order" }, { status: 500 }));
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { id } = await context.params;
    const session = await getAuthSession(request);
    if (!session?.user?.email) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const body = await request.json();
    const { orderStatus, paymentStatus } = body;

    const updateData: any = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    // Status tracking: when the status is really changing, the history entry
    // (and deliveredAt / cancelledAt / cancelledBy) are written in the same
    // atomic update. Every other request is sent exactly as it was before.
    let update: any = updateData;
    if (orderStatus) {
      const current = await Order.findById(id).select("orderStatus").lean<{ orderStatus?: string }>();
      const tracking = current
        ? statusChangeUpdate(current.orderStatus, orderStatus, { userId: String(user._id), role: user.role })
        : null;
      if (tracking) update = { $set: { ...updateData, ...tracking.$set }, $push: tracking.$push };
    }

    const order = await Order.findByIdAndUpdate(id, update, { new: true })
      .populate("user")
      .populate("items.product");

    if (!order) {
      return withCORS(NextResponse.json({ error: "Order not found" }, { status: 404 }));
    }

// Send status update email
    try {
      if (order.user) {
        const userData = order.user as any;
        const itemsData = order.items.map((item: any) => ({
          name: item.product?.name || "Product",
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize,
        }));

        const emailHtml = await getOrderStatusUpdateEmail({
          orderId: order.orderNumber,
          customerName: userData.name,
          orderStatus: order.orderStatus,
          items: itemsData,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          locale: resolveEmailLocale(userData.locale),
        });

        await sendEmail({
          to: userData.email,
          subject: `Order Status Updated - ${order.orderNumber}`,
          html: emailHtml,
        });
      }
    } catch (emailError) {
      console.error("Failed to send order status update email:", emailError);
    }

    // Send push notification to vendors AFTER successful update
    const shopIds = [
  ...new Set(
    (order.items as any[])
      .map((item) => item.shopId?.toString())
      .filter(Boolean)
  ),
] as string[];
    if (shopIds.length > 0) {
      await sendPushNotificationToMultipleVendors(
        shopIds,
        "📦 Order Status Updated by Admin",
        `Order #${order.orderNumber} status changed to ${order.orderStatus}.`,
        { screen: "orders", orderId: (order._id as any).toString() }
      );
    }

    return withCORS(NextResponse.json(order));
  } catch (error) {
    console.error("Error updating order:", error);
    return withCORS(NextResponse.json({ error: "Failed to update order" }, { status: 500 }));
  }
}
