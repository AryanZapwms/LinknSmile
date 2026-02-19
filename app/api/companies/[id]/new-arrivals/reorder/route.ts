import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

// PUT - Reorder products in New Arrivals
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "Valid productIds array is required" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (!company.newArrivals || company.newArrivals.length === 0) {
      return NextResponse.json(
        { error: "No new arrivals to reorder" },
        { status: 400 }
      );
    }

    // Create a map of current arrivals with their ObjectIds
    const arrivalsMap = new Map();
    company.newArrivals.forEach((item: any) => {
      const productIdStr = item.productId?.toString?.() || item.productId;
      arrivalsMap.set(productIdStr, item);
    });

    // Build reordered array with updated positions
    const reorderedArrivals = [];
    for (let i = 0; i < productIds.length; i++) {
      const productIdStr = productIds[i].toString?.() || productIds[i];
      const arrival = arrivalsMap.get(productIdStr);
      if (arrival) {
        // Update position
        arrival.position = i;
        reorderedArrivals.push(arrival);
      }
    }

    // Replace entire array with $set operator
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      {
        $set: {
          newArrivals: reorderedArrivals,
        },
      },
      { new: true }
    );

    console.log(
      "New Arrivals reordered. Total:",
      updatedCompany?.newArrivals.length,
      "Company ID:",
      updatedCompany?._id
    );

    return NextResponse.json({
      message: "Products reordered successfully",
      newArrivals: updatedCompany?.newArrivals,
    });
  } catch (error) {
    console.error("Error reordering new arrivals:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to reorder new arrivals",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
