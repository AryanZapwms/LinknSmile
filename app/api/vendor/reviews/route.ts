import mongoose from "mongoose"
import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"
import { Product } from "@/lib/models/product"

function buildSummary(reviews: any[]) {
  if (!reviews.length) {
    return {
      total: 0,
      averageRating: 0,
      ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }
  }
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  for (const review of reviews) {
    const rating = review.rating || 0
    if (ratingCounts[rating as keyof typeof ratingCounts] !== undefined) {
      ratingCounts[rating as keyof typeof ratingCounts] += 1
    }
    sum += rating
  }
  const averageRating = Number((sum / reviews.length).toFixed(1))
  return {
    total: reviews.length,
    averageRating,
    ratingCounts,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shopId = session.user.shopId
    if (!shopId) {
      return NextResponse.json({ error: "Shop not found in session" }, { status: 404 })
    }

    await connectDB()

    // Find all products for this shop to get their reviews
    const products = await Product.find({ shopId }).select("_id").lean()
    const productIds = products.map((p) => p._id)

    const reviews = await Review.find({ product: { $in: productIds }, isDeleted: false })
      .populate("product", "name image slug")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      reviews: reviews.map((review) => ({
        id: review._id.toString(),
        product: review.product
          ? {
              id: review.product._id.toString(),
              name: review.product.name,
              image: review.product.image || "",
              slug: review.product.slug,
            }
          : null,
        rating: review.rating,
        comment: review.comment,
        userName: review.userName,
        userEmail: review.userEmail,
        status: review.status,
        isVerifiedBuyer: review.isVerifiedBuyer,
        reply: review.reply
          ? {
              message: review.reply.message,
              repliedAt: review.reply.repliedAt,
              repliedBy: review.reply.repliedBy.toString(),
              repliedByName: review.reply.repliedByName,
            }
          : null,
        createdAt: review.createdAt,
      })),
      summary: buildSummary(reviews),
    })
  } catch (error) {
    console.error("Error fetching vendor reviews:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
