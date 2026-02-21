import mongoose from "mongoose"
import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 })
    }

    const { id: reviewId } = await params
    const { status } = await request.json()

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    await connectDB()

    const review = await Review.findById(reviewId)
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    review.status = status
    review.moderatedAt = new Date()
    review.moderatedBy = session.user.id
    review.auditLog.push({
      action: `REVIEW_${status}`,
      timestamp: new Date(),
      metadata: { moderatedBy: session.user.id }
    })

    await review.save()

    return NextResponse.json({ review: {
        id: review._id.toString(),
        status: review.status,
        moderatedAt: review.moderatedAt
    } })
  } catch (error) {
    console.error("Error updating review status:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
