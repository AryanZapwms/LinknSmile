import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

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

    const contentType = request.headers.get("content-type");
    let imageUrl = "";
    let title = "";
    let description = "";

    if (contentType?.includes("application/json")) {
      const body = await request.json();
      imageUrl = body.url;
      title = body.title || "";
      description = body.description || "";
    } else if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File;
      title = (formData.get("title") as string) || "";
      description = (formData.get("description") as string) || "";

      if (!file) {
        return NextResponse.json(
          { error: "Image file is required" },
          { status: 400 }
        );
      }

      // Save file locally with short path
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create carousel directory if it doesn't exist
      const carouselDir = path.join(process.cwd(), "public", "carousel");
      try {
        await fs.mkdir(carouselDir, { recursive: true });
      } catch (mkdirError) {
        console.error("Failed to create directory:", mkdirError);
      }

      // Generate unique filename
      const ext = file.name.split(".").pop() || "png";
      const filename = `carousel-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${ext}`;
      const filepath = path.join(carouselDir, filename);

      // Write file
      await fs.writeFile(filepath, buffer);

      // Store only the relative URL
      imageUrl = `/carousel/${filename}`;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL or file is required" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Create new carousel image object
    const newImage = {
      url: imageUrl,
      title,
      description,
    };

    // Add to carousel images array
    if (!company.carouselImages) {
      company.carouselImages = [];
    }
    company.carouselImages.push(newImage);

    // Mark the field as modified so Mongoose knows to save it
    company.markModified("carouselImages");

    const savedCompany = await company.save();

    console.log(
      "Carousel image added successfully. Total images:",
      savedCompany.carouselImages.length,
      "Company ID:",
      savedCompany._id
    );

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error adding carousel image:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to add carousel image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
console