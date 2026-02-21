import mongoose from "mongoose"
import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"

function buildSummary(reviews: any[]) {
  if (!reviews.length) {
    return {
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
    
    //  SECURITY CHECK: Only admins can access reviews
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (companyId) {
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return NextResponse.json({ error: "Invalid company id" }, { status: 400 })
      }

      const reviews = await Review.find({ company: companyId })
        .populate("product", "name image slug")
        .sort({ createdAt: -1 })
        .lean()

      return NextResponse.json({
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
          updatedAt: review.updatedAt,
        })),
        summary: buildSummary(reviews),
      })
    }

    const companies = await Review.aggregate([
      {
        $group: {
          _id: "$company",
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: "$company" },
      {
        $project: {
          companyId: "$company._id",
          name: "$company.name",
          slug: "$company.slug",
          logo: "$company.logo",
          totalReviews: 1,
          averageRating: { $round: ["$averageRating", 1] },
        },
      },
      { $sort: { name: 1 } },
    ])

    return NextResponse.json({
      companies: companies.map((item) => ({
        companyId: item.companyId.toString(),
        name: item.name,
        slug: item.slug,
        logo: item.logo,
        totalReviews: item.totalReviews,
        averageRating: item.averageRating,
      })),
    })
  } catch (error) {
    console.error("Error fetching admin reviews:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
