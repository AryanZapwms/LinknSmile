import mongoose from "mongoose"
import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"
import { Product } from "@/lib/models/product"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reviewId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json({ error: "Invalid review id" }, { status: 400 })
    }

    const body = await request.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""
    if (!message) {
      return NextResponse.json({ error: "Reply message is required" }, { status: 400 })
    }

    await connectDB()

    // Find review and check if it belongs to the vendor's product
    const review = await Review.findById(reviewId).populate("product")
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    const product = await Product.findById(review.product).select("shopId")
    if (!product || product.shopId.toString() !== session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized to reply to this review" }, { status: 403 })
    }

    review.reply = {
      message,
      repliedAt: new Date(),
      repliedBy: session.user.id,
      repliedByName: session.user.name || "Shop Owner",
    }

    await review.save()

    return NextResponse.json({ 
        success: true,
        review: {
            id: review._id.toString(),
            reply: {
                message: review.reply.message,
                repliedAt: review.reply.repliedAt,
                repliedBy: review.reply.repliedBy.toString(),
                repliedByName: review.reply.repliedByName,
            }
        }
    })
  } catch (error) {
    console.error("Error replying to review:", error)
    return NextResponse.json({ error: "Failed to reply to review" }, { status: 500 })
  }
}
