import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { Product } from "@/lib/models/product";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

type ParamType = { params: Promise<{ id: string; itemId: string }> };

type UpdatePayload = {
  title?: string;
  image?: string;
  description?: string;
  productId?: string;
  isActive?: boolean;
};

export async function PUT(request: Request, { params }: ParamType) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id, itemId } = await params;
    const body: UpdatePayload = await request.json();

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const concern = (company.shopByConcern || []).find(
      (item: any) => item._id?.toString() === itemId
    );

    if (!concern) {
      return NextResponse.json(
        { error: "Shop by Concern item not found" },
        { status: 404 }
      );
    }

    if (body.productId) {
      const product = await Product.findById(body.productId);
      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      if (product.company.toString() !== id) {
        return NextResponse.json(
          { error: "Product does not belong to this company" },
          { status: 400 }
        );
      }

      concern.product = new mongoose.Types.ObjectId(body.productId);
    }

    if (typeof body.title === "string") {
      concern.title = body.title;
    }

    if (typeof body.image === "string") {
      concern.image = body.image;
    }

    if (typeof body.description === "string" || body.description === null) {
      concern.description = body.description || "";
    }

    if (typeof body.isActive === "boolean") {
      concern.isActive = body.isActive;
    }

    await company.save();

    const populatedCompany = await Company.findById(id).populate({
      path: "shopByConcern.product",
      select: "name slug company",
      populate: {
        path: "company",
        select: "name slug",
      },
    });

    return NextResponse.json({
      item: populatedCompany?.shopByConcern?.find(
        (item: any) => item._id.toString() === itemId
      ),
    });
  } catch (error) {
    console.error("Error updating shop by concern item:", error);
    return NextResponse.json(
      {
        error: "Failed to update shop by concern item",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: ParamType) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id, itemId } = await params;

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const initialLength = company.shopByConcern?.length || 0;

    const concernToDelete = (company.shopByConcern || []).find(
      (item: any) => item._id?.toString() === itemId
    );

    company.shopByConcern = (company.shopByConcern || []).filter(
      (item: any) => item._id?.toString() !== itemId
    );

    if ((company.shopByConcern?.length || 0) === initialLength || !concernToDelete) {
      return NextResponse.json(
        { error: "Shop by Concern item not found" },
        { status: 404 }
      );
    }

    if (concernToDelete.image && concernToDelete.image.startsWith("/")) {
      const normalizedPath = concernToDelete.image.replace(/^[\/\\]+/, "");
      if (!normalizedPath.startsWith("http")) {
        const imagePath = path.join(process.cwd(), "public", normalizedPath);
        try {
          await fs.unlink(imagePath);
        } catch (unlinkError) {
          console.error("Failed to delete shop by concern image file:", unlinkError);
        }
      }
    }

    await company.save();

    return NextResponse.json({ message: "Shop by Concern item deleted" });
  } catch (error) {
    console.error("Error deleting shop by concern item:", error);
    return NextResponse.json(
      {
        error: "Failed to delete shop by concern item",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
