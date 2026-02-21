import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { Cart } from "@/lib/models/cart";
import Shop from "@/lib/models/shop";
import { sendEmail } from "@/lib/email";

// Helper function to generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();
    const {
      items,
      shippingAddress,
      totalAmount,
      paymentMethod,
      paymentStatus,
      razorpayOrderId,
      razorpayPaymentId,
    } = body;

    // Validate required fields
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items in order" },
        { status: 400 }
      );
    }

    if (!shippingAddress) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    // ✅ NEW: Process each item with vendor information
    const processedItems = [];
    const vendorPayouts: Record<string, {
      shopId: string;
      amount: number;
      items: any[];
    }> = {};

    for (const item of items) {
      // Fetch product to get latest stock and info
      const product = await Product.findById(item.product)
        .populate('shopId', 'shopName commissionRate')
        .lean();

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product} not found` },
          { status: 404 }
        );
      }

      // Check stock availability
      const stockToCheck = item.selectedSize 
        ? product.sizes?.find(
            (s: any) => 
              s.size === item.selectedSize.size && 
              s.quantity === item.selectedSize.quantity
          )?.stock || 0
        : product.stock;

      if (stockToCheck < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      // ✅ Calculate commission and vendor earnings - STRICT VALIDATION
      const dbShopId = product.shopId?._id || product.shopId;
      
      if (!dbShopId) {
        return NextResponse.json(
          { error: `Product ${product.name} is missing a valid vendor assignment.` },
          { status: 400 }
        );
      }

      const shopId = dbShopId.toString();
      const shopName = product.shopId?.shopName || 'LinkAndSmile Platform';
      const commissionRate = product.shopId?.commissionRate ?? 10;
      
      const itemTotal = item.price * item.quantity;
      const platformCommission = (itemTotal * commissionRate) / 100;
      const vendorEarnings = itemTotal - platformCommission;

      // Add to processed items
      processedItems.push({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        selectedSize: item.selectedSize,
        // ✅ Vendor tracking fields
        shopId: dbShopId, // Keep as ObjectId if possible or let Mongoose handle string-to-oid
        shopName: shopName,
        platformCommission: platformCommission,
        vendorEarnings: vendorEarnings,
        commissionRate: commissionRate,
      });

      // ✅ Group by vendor for payout tracking - Ensure shopId is handled correctly
      if (!vendorPayouts[shopId]) {
        vendorPayouts[shopId] = {
          shopId: dbShopId, // Use the ObjectId/original value
          amount: 0,
          items: [],
        };
      }
      vendorPayouts[shopId].amount += vendorEarnings;
      vendorPayouts[shopId].items.push({
        productId: item.product,
        productName: product.name,
        quantity: item.quantity,
        earnings: vendorEarnings,
      });
    }

    // Create order with vendor payout information
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: session.user.id,
      items: processedItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentStatus || "pending",
      orderStatus: "pending",
      razorpayOrderId,
      razorpayPaymentId,
      vendorPayouts: Object.values(vendorPayouts).map(v => ({
        shopId: v.shopId,
        amount: v.amount,
        status: paymentStatus === "completed" ? "pending" : "held",
      })),
    });

    // ✅ Credit vendor wallets via ledger (only for Razorpay-paid orders)
    // COD orders are credited when order is marked as delivered
    if (paymentStatus === "completed") {
      try {
        const { LedgerService } = await import("@/lib/services/ledger-service");
        await LedgerService.recordSale({
          orderId: order._id.toString(),
          items: processedItems.map((item: any) => ({
            shopId: item.shopId.toString(),
            vendorEarnings: item.vendorEarnings,
            commission: item.platformCommission,
          })),
          performedBy: "SYSTEM",
        });
      } catch (ledgerError) {
        // Don't fail the order if ledger write fails — flag for reconciliation
        console.error("[Orders] Ledger recordSale failed for order", order._id, ledgerError);
      }
    }

    // ✅ Update inventory for each item
    for (const item of items) {
      if (item.selectedSize) {
        // Update size-specific stock
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              [`sizes.$[elem].stock`]: -item.quantity,
            },
          },
          {
            arrayFilters: [
              {
                "elem.size": item.selectedSize.size,
                "elem.quantity": item.selectedSize.quantity,
              },
            ],
          }
        );
      } else {
        // Update general stock
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    // ✅ Update shop stats for each vendor
    for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
      if (shopId !== "699942a5a2b407e83b6d9ea8") {
        await Shop.findByIdAndUpdate(shopId, {
          $inc: {
            'stats.totalOrders': 1,
            'stats.totalRevenue': payoutInfo.amount,
          },
        });
      }
    }

    // ✅ Clear the user's cart in DB
    try {
      await Cart.findOneAndUpdate(
        { userId: session.user.id },
        { items: [], $inc: { version: 1 } },
        { upsert: true }
      );
    } catch (cartError) {
      console.error("[Orders] Failed to clear cart:", cartError);
    }

    // ✅ Send emails
    try {
      // 1. Send confirmation to customer
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
                ${processedItems.map(item => {
                  const product = items.find((i: any) => i.product === item.product.toString());
                  return `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #ddd;">
                        ${product?.name || 'Product'}
                        ${item.selectedSize ? `<br/><small>(${item.selectedSize.size})</small>` : ''}
                        <br/><small style="color: #888;">by ${item.shopName}</small>
                      </td>
                      <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
                      <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>Total:</strong></td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>₹${totalAmount.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>

            <h2 style="color: #555; margin-top: 30px;">Shipping Address:</h2>
            <p>
              ${shippingAddress.name}<br/>
              ${shippingAddress.street}<br/>
              ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br/>
              ${shippingAddress.country}<br/>
              Phone: ${shippingAddress.phone}
            </p>

            <p style="margin-top: 30px; color: #666;">
              Payment Method: <strong>${paymentMethod.toUpperCase()}</strong><br/>
              Payment Status: <strong>${paymentStatus || 'Pending'}</strong>
            </p>

            <p style="margin-top: 30px; color: #888; font-size: 12px;">
              You will receive updates about your order via email. Track your order status in your account dashboard.
            </p>
          </div>
        `,
      });

      // 2. Send notification to each vendor
      for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
        if (shopId === 'platform') continue; // Skip platform items

        // Get shop owner email
        const shop = await Shop.findById(shopId).populate('ownerId', 'email name').lean();
        if (shop && shop.ownerId) {
          await sendEmail({
            to: (shop.ownerId as any).email,
            subject: `New Order Received - ${orderNumber}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">New Order Received!</h1>
                <p>You have a new order for your shop: <strong>${shop.shopName}</strong></p>
                
                <h2 style="color: #555; margin-top: 30px;">Order Details:</h2>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <thead>
                    <tr style="background: #f5f5f5;">
                      <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
                      <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
                      <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Your Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${payoutInfo.items.map(item => `
                      <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.productName}</td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${item.earnings.toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background: #f0f8ff;">
                      <td colspan="2" style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>Total Earnings:</strong></td>
                      <td style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>₹${payoutInfo.amount.toFixed(2)}</strong></td>
                    </tr>
                  </tfoot>
                </table>

                <h2 style="color: #555; margin-top: 30px;">Shipping Address:</h2>
                <p>
                  ${shippingAddress.name}<br/>
                  ${shippingAddress.street}<br/>
                  ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br/>
                  Phone: ${shippingAddress.phone}
                </p>

                <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
                  <strong>Action Required:</strong> Please prepare the items for shipping. You can manage this order from your vendor dashboard.
                </p>

                <p style="margin-top: 20px; color: #888; font-size: 12px;">
                  Payment will be released to your account after successful delivery of the order.
                </p>
              </div>
            `,
          });
        }
      }

      // 3. Send notification to admin (optional)
      if (process.env.ADMIN_EMAIL) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: `New Order - ${orderNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>New Order Received</h2>
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
              <p><strong>Items:</strong> ${processedItems.length}</p>
              <p><strong>Vendors:</strong> ${Object.keys(vendorPayouts).length}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              <p><strong>Payment Status:</strong> ${paymentStatus || 'Pending'}</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the order if email fails
    }

    return NextResponse.json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      message: "Order created successfully",
    });
  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const orders = await Order.find({ user: session.user.id })
      .populate("items.product", "name image slug")
      .sort({ createdAt: -1 })
      .lean();

    // The /profile/orders page expects a plain array
    const { searchParams } = new URL(req.url);
    if (searchParams.get("userOrders") === "true") {
      return NextResponse.json(orders);
    }

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
