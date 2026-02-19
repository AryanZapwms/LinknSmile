import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { Product } from "@/lib/models/product";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

// GET - Fetch New Arrivals with full product details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Filter by visibility setting if requested
    const showAll = new URL(request.url).searchParams.get("all") === "true";

    if (!showAll && !company.newArrivalsSettings?.isVisible) {
      return NextResponse.json({
        newArrivals: [],
        settings: company.newArrivalsSettings,
      });
    }

    // Manually populate products
    const newArrivalsList = company.newArrivals || [];
    const productIds = newArrivalsList.map((item: any) => item.productId);

    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

    // Sort by position and limit
    const limit = company.newArrivalsSettings?.limit || 10;
    const newArrivals = newArrivalsList
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .slice(0, limit)
      .map((item: any) => {
        const product = productMap.get(item.productId.toString());
        return {
          _id: item._id,
          productId: product || item.productId,
          product: product || item.productId,
          title: item.title,
          image: item.image,
          description: item.description,
          position: item.position,
          addedAt: item.addedAt,
        };
      });

    return NextResponse.json({
      newArrivals,
      settings: company.newArrivalsSettings,
    });
  } catch (error) {
    console.error("Error fetching new arrivals:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch new arrivals",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Add product to New Arrivals
export async function POST(
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
    const { productId, title, image, description } = body;

    if (!productId || !title || !image) {
      return NextResponse.json(
        { error: "Product ID, title, and image are required" },
        { status: 400 }
      );
    }

    // Validate product exists and belongs to this company
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.company.toString() !== id) {
      return NextResponse.json(
        { error: "Product does not belong to this company" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Initialize newArrivals if not exists
    if (!company.newArrivals) {
      company.newArrivals = [];
      company.markModified("newArrivals");
      await company.save();
      // Refetch to get fresh instance
      const refreshedCompany = await Company.findById(id);
      if (refreshedCompany && !refreshedCompany.newArrivals) {
        refreshedCompany.newArrivals = [];
      }
    }

    // Re-fetch to ensure we have latest state
    const freshCompany = await Company.findById(id);
    if (!freshCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const alreadyExists = (freshCompany.newArrivals || []).some(
      (item: any) =>
        item.productId?.toString() === productId || item.productId === productId
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "Product already in new arrivals" },
        { status: 400 }
      );
    }

    // Calculate next position
    const currentArrivals = freshCompany.newArrivals || [];
    const position =
      Math.max(...currentArrivals.map((item: any) => item.position || 0), 0) +
      1;

    // Use MongoDB update operator for reliable array push
    console.log("Attempting to update company with ID:", id);
    console.log("Company exists:", freshCompany._id);

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      {
        $push: {
          newArrivals: {
            _id: new mongoose.Types.ObjectId(),
            productId: new mongoose.Types.ObjectId(productId),
            title,
            image,
            description: description || "",
            position,
            addedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    console.log(
      "Update result:",
      updatedCompany ? "Success" : "Failed",
      updatedCompany?._id
    );

    if (!updatedCompany) {
      console.error("findByIdAndUpdate returned null/undefined");
      return NextResponse.json(
        { error: "Failed to update company - returned null" },
        { status: 500 }
      );
    }

    console.log(
      "Product added to new arrivals. Total:",
      updatedCompany.newArrivals?.length || 0,
      "Company ID:",
      updatedCompany._id
    );

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("Error adding product to new arrivals:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to add product to new arrivals",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
