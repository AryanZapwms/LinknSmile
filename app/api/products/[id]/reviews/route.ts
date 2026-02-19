import mongoose from "mongoose"
import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"
import { Product } from "@/lib/models/product"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const emptySummary = {
  total: 0,
  averageRating: 0,
  ratingCounts: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
}

function buildSummary(reviews: any[]) {
  if (!reviews.length) {
    return emptySummary
  }
  const ratingCounts = { ...emptySummary.ratingCounts }
  let sum = 0
  for (const review of reviews) {
    const rating = review.rating || 0
    if (ratingCounts[review.rating as keyof typeof ratingCounts] !== undefined) {
      ratingCounts[review.rating as keyof typeof ratingCounts] += 1
    }
    sum += rating
  }
  const average = Number((sum / reviews.length).toFixed(1))
  return {
    total: reviews.length,
    averageRating: average,
    ratingCounts,
  }
}

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

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { id: productId } = await params
    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 })
    }

    await connectDB()

    const reviews = await Review.find({ product: productId }).sort({ createdAt: -1 }).lean()
    const summary = buildSummary(reviews)

    return NextResponse.json({
      reviews: reviews.map(mapReview),
      summary,
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Await params in Next.js 15+
    const { id: productId } = await params
    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 })
    }

    const body = await request.json()
    const rating = Number(body.rating)
    const comment = typeof body.comment === "string" ? body.comment.trim() : ""
    const bodyName = typeof body.userName === "string" ? body.userName.trim() : ""
    const bodyEmail = typeof body.userEmail === "string" ? body.userEmail.trim() : ""

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    if (!comment) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 })
    }

    if (!bodyName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!bodyEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    await connectDB()

    const product = await Product.findById(productId).select("company")
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const companyId = product.company
    if (!companyId) {
      return NextResponse.json({ error: "Product company missing" }, { status: 400 })
    }

    const userId = session.user.id
    const userName = bodyName || session.user.name || ""
    const userEmail = bodyEmail || session.user.email || ""

    const existingReview = await Review.findOne({ product: productId, user: userId })
    let review
    let created = false

    if (existingReview) {
      existingReview.rating = rating
      existingReview.comment = comment
      existingReview.userName = userName
      existingReview.userEmail = userEmail
      existingReview.reply = undefined
      review = await existingReview.save()
    } else {
      review = await Review.create({
        product: productId,
        company: companyId,
        user: userId,
        rating,
        comment,
        userName,
        userEmail,
      })
      created = true
    }

    const reviews = await Review.find({ product: productId }).sort({ createdAt: -1 }).lean()
    const summary = buildSummary(reviews)

    return NextResponse.json(
      {
        review: mapReview(review.toObject ? review.toObject() : review),
        summary,
      },
      { status: created ? 201 : 200 },
    )
  } catch (error: any) {
    console.error("Error submitting review:", error)
    if (error?.code === 11000) {
      return NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
  }
}