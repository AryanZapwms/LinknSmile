import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

// PUT - Update New Arrival item (title, image, description)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id, productId } = await params;
    const body = await request.json();
    const { title, image, description } = body;

    if (!title || !image) {
      return NextResponse.json(
        { error: "Title and image are required" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Find and update the specific new arrival item
    const arrivalIndex = (company.newArrivals || []).findIndex(
      (item: any) => item.productId?.toString() === productId || item.productId === productId
    );

    if (arrivalIndex === -1) {
      return NextResponse.json(
        { error: "Product not found in new arrivals" },
        { status: 404 }
      );
    }

    // Update using positional operator
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      {
        $set: {
          "newArrivals.$[elem].title": title,
          "newArrivals.$[elem].image": image,
          "newArrivals.$[elem].description": description || "",
        },
      },
      {
        arrayFilters: [{ "elem.productId": new mongoose.Types.ObjectId(productId) }],
        new: true,
      }
    );

    if (!updatedCompany) {
      return NextResponse.json(
        { error: "Failed to update new arrival" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("Error updating new arrival:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to update new arrival",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove product from New Arrivals
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id, productId } = await params;

    // First check if product exists in new arrivals
    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const newArrival = (company.newArrivals || []).find(
      (item: any) =>
        item.productId?.toString() === productId || item.productId === productId
    );

    if (!newArrival) {
      return NextResponse.json(
        { error: "Product not found in new arrivals" },
        { status: 404 }
      );
    }

    // Use MongoDB $pull operator to remove from array
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      {
        $pull: {
          newArrivals: {
            productId: new mongoose.Types.ObjectId(productId),
          },
        },
      },
      { new: true }
    );

    if (newArrival.image && newArrival.image.startsWith("/")) {
      const normalizedPath = newArrival.image.replace(/^[\/\\]+/, "");
      if (!normalizedPath.startsWith("http")) {
        const imagePath = path.join(process.cwd(), "public", normalizedPath);
        try {
          await fs.unlink(imagePath);
        } catch (unlinkError) {
          console.error("Failed to delete new arrival image file:", unlinkError);
        }
      }
    }

    console.log(
      "Product removed from new arrivals. Remaining:",
      updatedCompany?.newArrivals.length,
      "Company ID:",
      updatedCompany?._id
    );

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("Error removing product from new arrivals:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to remove product from new arrivals",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
