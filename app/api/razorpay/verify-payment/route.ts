import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import Shop from "@/lib/models/shop"
import { Cart } from "@/lib/models/cart"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature, 
      items, 
      shippingAddress, 
      totalAmount 
    } = await request.json()

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex")

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    await connectDB()

    // Get current user session
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if order already exists with this Razorpay payment ID (idempotency)
    let existingOrder = await Order.findOne({ razorpayPaymentId })
    if (existingOrder) {
      return NextResponse.json({ success: true, orderId: existingOrder._id })
    }

    // Check if order was already created via /api/orders with pending status
    existingOrder = await Order.findOne({
      user: user._id,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      totalAmount,
    }).sort({ createdAt: -1 })

    // ✅ NEW: Process items with vendor information
    const processedItems = []
    const vendorPayouts: Record<string, {
      shopId: string;
      shopName: string;
      amount: number;
      items: any[];
    }> = {}

    for (const item of items) {
      const product = await Product.findById(item.product)
        .populate('shopId', 'shopName commissionRate')
        .lean()

      if (!product) {
        console.error(`Product ${item.product} not found`)
        continue // Skip missing products instead of failing entire order
      }

      // ✅ Calculate commission and vendor earnings - STRICT VALIDATION
      const dbShopId = product.shopId?._id || product.shopId;
      
      if (!dbShopId) {
        console.error(`Product ${product.name} is missing a vendorId and cannot be processed.`);
        continue; // Or handle as an error
      }

      const shopId = dbShopId.toString();
      const shopName = product.shopId?.shopName || 'LinkAndSmile Platform';
      const commissionRate = product.shopId?.commissionRate ?? 10;
      
      const itemTotal = item.price * item.quantity;
      const platformCommission = (itemTotal * commissionRate) / 100;
      const vendorEarnings = itemTotal - platformCommission;

      processedItems.push({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        selectedSize: item.selectedSize,
        // ✅ Vendor tracking
        shopId: dbShopId, 
        shopName: shopName,
        platformCommission: platformCommission,
        vendorEarnings: vendorEarnings,
        commissionRate: commissionRate,
      })

      // ✅ Group by vendor for payout tracking
      if (!vendorPayouts[shopId]) {
        vendorPayouts[shopId] = {
          shopId: dbShopId,
          shopName: shopName,
          amount: 0,
          items: [],
        }
      }
      vendorPayouts[shopId].amount += vendorEarnings
      vendorPayouts[shopId].items.push({
        productId: item.product,
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        earnings: vendorEarnings,
      })
    }

    let order

    if (existingOrder) {
      // Update existing order with payment details
      order = await Order.findByIdAndUpdate(
        existingOrder._id,
        {
          razorpayOrderId,
          razorpayPaymentId,
          paymentStatus: "completed",
          orderStatus: "processing",
          items: processedItems, // ✅ Update with vendor info
          vendorPayouts: Object.values(vendorPayouts).map(v => ({
            shopId: v.shopId,
            amount: v.amount,
            status: "pending",
          })),
        },
        { new: true }
      )
    } else {
      // Create new order
      const orderNumber = `ORD-${Date.now()}`

      order = await Order.create({
        orderNumber,
        user: user._id,
        items: processedItems, // ✅ Use processed items with vendor info
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
        // ✅ Add vendor payouts
        vendorPayouts: Object.values(vendorPayouts).map(v => ({
          shopId: v.shopId,
          amount: v.amount,
          status: "pending",
        })),
      })
    }

    // ✅ Update product stock (handle size variants)
    await Promise.all(
      items.map(async (item: any) => {
        const quantity = item.quantity ?? 0
        if (quantity && item.product) {
          if (item.selectedSize) {
            // Update size-specific stock
            await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: {
                  [`sizes.$[elem].stock`]: -quantity,
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
            )
          } else {
            // Update general stock
            await Product.findByIdAndUpdate(item.product, { 
              $inc: { stock: -quantity } 
            })
          }
        }
      })
    )

    // ✅ Update shop stats for each vendor
    for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
      if (shopId !== '699942a5a2b407e83b6d9ea8') {
        await Shop.findByIdAndUpdate(shopId, {
          $inc: {
            'stats.totalOrders': 1,
            'stats.totalRevenue': payoutInfo.amount,
          },
        })
      }
    }

    // ✅ Clear the user's cart in DB
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

    // ✅ NEW: Record entry in Ledger System
    try {
      const ledgerItems = processedItems.map(item => ({
        shopId: item.shopId,
        vendorEarnings: item.vendorEarnings,
        commission: item.platformCommission
      }));
      
      const { LedgerService } = await import("@/lib/services/ledger-service");
      await LedgerService.recordSale({
        orderId: order._id.toString(),
        totalAmount,
        items: ledgerItems
      });
    } catch (ledgerError) {
      console.error("Ledger recording failed, but payment succeeded:", ledgerError);
      // We log but don't fail here to avoid inconsistencies, 
      // though in a perfect world this should be part of a distributed transaction.
    }

    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

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
    }

    // Send confirmation emails
    try {
      const populatedOrder = await Order.findById(order._id)
        .populate("items.product")
        .lean()

      if (populatedOrder) {
        const itemsData = populatedOrder.items.map((item: any) => ({
          name: item.product?.name || "Product",
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize,
          shopName: item.shopName, // ✅ Include vendor name
        }))

        // 1. Send confirmation email to customer
        const confirmationEmailHtml = getOrderConfirmationEmail({
          orderId: order.orderNumber,
          customerName: user.name,
          items: itemsData,
          total: order.totalAmount,
          orderDate: orderDate,
          paymentStatus: "completed",
        })

        await sendEmail({
          to: user.email,
          subject: `Order Confirmation - ${order.orderNumber}`,
          html: confirmationEmailHtml,
        })

        // 2. Send admin notification email
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
          orderDate: orderDate,
        })

        await sendEmail({
          to: process.env.GMAIL_EMAIL || "instapeels@gmail.com",
          subject: `🚨 NEW ORDER - ${order.orderNumber}`,
          html: adminEmailHtml,
        })

        // ✅ 3. NEW: Send notification to each vendor
        for (const [shopId, payoutInfo] of Object.entries(vendorPayouts)) {
          if (shopId === 'platform') continue // Skip platform items

          // Get shop owner email
          const shop = await Shop.findById(shopId).populate('ownerId', 'email name').lean()
          if (shop && shop.ownerId) {
            const vendorEmailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">
                  🎉 New Paid Order Received!
                </h1>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 16px;">
                    <strong>Shop:</strong> ${payoutInfo.shopName}
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 16px;">
                    <strong>Order Number:</strong> ${order.orderNumber}
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 16px;">
                    <strong>Payment:</strong> <span style="color: #16a34a;">✓ Completed</span>
                  </p>
                </div>

                <h2 style="color: #334155; margin-top: 30px;">Your Items:</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                  <thead>
                    <tr style="background: #f1f5f9;">
                      <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Product</th>
                      <th style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">Qty</th>
                      <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Your Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${payoutInfo.items.map((item: any) => `
                      <tr>
                        <td style="padding: 12px; border: 1px solid #e2e8f0;">${item.productName}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">${item.quantity}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: 600;">
                          ₹${item.earnings.toFixed(2)}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background: #ecfdf5;">
                      <td colspan="2" style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold;">
                        Total Earnings:
                      </td>
                      <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: #16a34a; font-size: 18px;">
                        ₹${payoutInfo.amount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
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
                  <p style="margin: 0; font-weight: 600; color: #1e40af;">
                    📦 Action Required: Please prepare these items for shipping
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: #1e3a8a;">
                    Log in to your vendor dashboard to manage this order and update shipping status.
                  </p>
                </div>

                <p style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                  💰 Payment will be released to your account after successful delivery confirmation.<br/>
                  📧 For support, reply to this email or contact admin.
                </p>
              </div>
            `

            await sendEmail({
              to: (shop.ownerId as any).email,
              subject: `🎉 New Paid Order - ${order.orderNumber} - ${payoutInfo.shopName}`,
              html: vendorEmailHtml,
            })
          }
        }
      }
    } catch (emailError) {
      console.error("Failed to send order emails:", emailError)
      // Don't fail the order creation if email fails
    }

    return NextResponse.json({
      success: true,
      orderId: order._id,
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
  }
}