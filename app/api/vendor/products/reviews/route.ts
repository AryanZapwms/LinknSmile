// app/api/products/[id]/reviews/route.ts
// GET: fetch approved reviews for a product
// POST: submit a new review (authenticated users only, must have purchased)

import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models/review";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// ─── GET: public reviews for a product ───────────────────────────────────────
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return withCORS(NextResponse.json({ error: "Invalid product ID" }, { status: 400 }));
    }

    const reviews = await Review.find({
      product: id,
      status: "APPROVED",
      isDeleted: false,
    })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    const total = reviews.length;
    const averageRating =
      total > 0
        ? parseFloat(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
          )
        : 0;

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      ratingCounts[r.rating as keyof typeof ratingCounts]++;
    });

    return withCORS(
      NextResponse.json({
        success: true,
        reviews: reviews.map((r) => ({
          _id: r._id.toString(),
          rating: r.rating,
          comment: r.comment,
          userName: r.userName,
          user: r.user,
          isVerifiedBuyer: r.isVerifiedBuyer,
          reply: r.reply || null,
          createdAt: r.createdAt,
        })),
        summary: { total, averageRating, ratingCounts },
      })
    );
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    );
  }
}

// ─── POST: submit a review ────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return withCORS(
        NextResponse.json({ error: "You must be logged in to leave a review" }, { status: 401 })
      );
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return withCORS(NextResponse.json({ error: "Invalid product ID" }, { status: 400 }));
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return withCORS(NextResponse.json({ error: "Product not found" }, { status: 404 }));
    }

    // Check if already reviewed
    const existing = await Review.findOne({
      product: productId,
      user: session.user.id,
      isDeleted: false,
    });
    if (existing) {
      return withCORS(
        NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 })
      );
    }

    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return withCORS(
        NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
      );
    }
    if (!comment || comment.trim().length < 10) {
      return withCORS(
        NextResponse.json({ error: "Review must be at least 10 characters" }, { status: 400 })
      );
    }

    // Check if verified buyer (has a delivered order containing this product)
    const deliveredOrder = await Order.findOne({
      user: session.user.id,
      "items.product": productId,
      orderStatus: "delivered",
    });
    const isVerifiedBuyer = !!deliveredOrder;

    const review = await Review.create({
      product: productId,
      company: (product as any).company,
      user: session.user.id,
      rating: parseInt(rating),
      comment: comment.trim(),
      userName: session.user.name || "Anonymous",
      userEmail: session.user.email || "",
      isVerifiedBuyer,
      status: "PENDING", // Admin approves before it goes live
    });

    return withCORS(
      NextResponse.json(
        {
          success: true,
          message: isVerifiedBuyer
            ? "Your review has been submitted and will appear after moderation."
            : "Review submitted! It will appear after our team reviews it.",
          review: {
            _id: review._id.toString(),
            rating: review.rating,
            comment: review.comment,
            status: review.status,
            isVerifiedBuyer: review.isVerifiedBuyer,
          },
        },
        { status: 201 }
      )
    );
  } catch (error: any) {
    // Duplicate key = already reviewed
    if (error.code === 11000) {
      return withCORS(
        NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 })
      );
    }
    console.error("Error submitting review:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
    );
  }
}