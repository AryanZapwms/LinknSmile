import { withCORS } from "@/lib/cors";
import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models/review";
import "@/lib/models/product";   // registers Product ref
import "@/lib/models/company";   // registers Company ref

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    await connectDB();

    const reviews = await Review.find({ isDeleted: { $ne: true } })
      .populate({ path: "product", select: "name image" })
      .populate({ path: "company", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    const mappedReviews = reviews.map((review: any) => ({
      id: review._id.toString(),
      productId: review.product?._id?.toString() ?? "",
      productName: review.product?.name ?? "Unknown Product",
      productImage: review.product?.image ?? "/placeholder.jpg",
      companyId: review.company?._id?.toString() ?? "",
      company: review.company?.name ?? "Unknown Company",
      customerName: review.userName ?? "Anonymous",
      rating: review.rating ?? 5,
      comment: review.comment ?? "",
      createdAt: review.createdAt,
    }));

    return withCORS(NextResponse.json({
      success: true,
      reviews: mappedReviews,
      count: mappedReviews.length,
    }));
  } catch (error) {
    console.error("Error fetching all reviews:", error);
    return withCORS(NextResponse.json(
      { success: false, error: "Failed to fetch reviews", reviews: [] },
      { status: 500 }
    ));
  }
}