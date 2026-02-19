import { type NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      payment_capture: 1, // Auto-capture after successful payment
    }

    const razorpayOrder = await razorpay.orders.create(options)

    return NextResponse.json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    })
  } catch (error) {
    console.error("Razorpay error:", error)
    return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 })
  }
}
