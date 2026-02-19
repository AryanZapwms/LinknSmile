  import mongoose from "mongoose"
import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"

function mapReview(review: any) {
  return {
    id: review._id.toString(),
    productId: review.product.toString(),
    companyId: review.company.toString(),
    userId: review.user.toString(),
    rating: review.rating,
    comment: review.comment,
    userName: review.userName,
    userEmail: review.userEmail,
    reply: review.reply
      ? {
          message: review.reply.message,
          repliedAt: review.reply.repliedAt,
          repliedBy: review.reply.repliedBy.toString(),
          repliedByName: review.reply.repliedByName,
        }
      : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reviewId } = await params
    const session = await getServerSession(authOptions)
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json({ error: "Invalid review id" }, { status: 400 })
    }

    const body = await request.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""
    if (!message) {
      return NextResponse.json({ error: "Reply message is required" }, { status: 400 })
    }

    await connectDB()

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        reply: {
          message,
          repliedAt: new Date(),
          repliedBy: session.user.id,
          repliedByName: session.user.name || "Admin",
        },
      },
      { new: true },
    )

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    return NextResponse.json({ review: mapReview(review.toObject()) })
  } catch (error) {
    console.error("Error replying to review:", error)
    return NextResponse.json({ error: "Failed to reply to review" }, { status: 500 })
  }
}
