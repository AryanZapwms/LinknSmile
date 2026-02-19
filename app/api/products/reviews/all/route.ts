import mongoose from "mongoose"
import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"
import { Product } from "@/lib/models/product"
import { Company } from "@/lib/models/company"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Fetch all reviews with product and company details
    const reviews = await Review.find()
      .populate({
        path: "product",
        select: "name image",
      })
      .populate({
        path: "company",
        select: "name",
      })
      .sort({ createdAt: -1 })
      .lean()

    // Map reviews to the expected format
    const mappedReviews = reviews.map((review: any) => ({
      id: review._id.toString(),
      productId: review.product?._id?.toString() || "",
      productName: review.product?.name || "Product",
      productImage: review.product?.image || "/placeholder.jpg",
      companyId: review.company?._id?.toString() || "",
      company: review.company?.name || review.company || "Instapeels",
      customerName: review.userName || "Anonymous",
      rating: review.rating || 5,
      comment: review.comment || "",
      createdAt: review.createdAt,
    }))

    return NextResponse.json({
      success: true,
      reviews: mappedReviews,
      count: mappedReviews.length,
    })
  } catch (error) {
    console.error("Error fetching all reviews:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reviews",
        reviews: [],
      },
      { status: 500 }
    )
  }
}