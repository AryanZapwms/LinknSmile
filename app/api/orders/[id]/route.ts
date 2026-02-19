import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail, getOrderStatusUpdateEmail } from "@/lib/email"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params // await params

    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const order = await Order.findOne({ _id: id, user: user._id })
      .populate({
        path: "items.product",
        populate: { path: "company", select: "name slug" },
      })
      .lean()

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params // ✅ await params

    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { orderStatus, paymentStatus } = body

    const updateData: any = {}
    if (orderStatus) updateData.orderStatus = orderStatus
    if (paymentStatus) updateData.paymentStatus = paymentStatus

    const order = await Order.findByIdAndUpdate(id, updateData, { new: true })
      .populate("user")
      .populate("items.product")

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Send status update email
    try {
      if (order.user) {
        const userData = order.user as any
        const itemsData = order.items.map((item: any) => ({
          name: item.product?.name || "Product",
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize,
        }))

        const emailHtml = getOrderStatusUpdateEmail({
          orderId: order.orderNumber,
          customerName: userData.name,
          orderStatus: order.orderStatus,
          items: itemsData,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
        })

        await sendEmail({
          to: userData.email,
          subject: `Order Status Updated - ${order.orderNumber}`,
          html: emailHtml,
        })
      }
    } catch (emailError) {
      console.error("Failed to send order status update email:", emailError)
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
