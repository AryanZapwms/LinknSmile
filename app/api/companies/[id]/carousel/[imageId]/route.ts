import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id, imageId } = await params;

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Find and delete the image file
    if (company.carouselImages) {
      const imageToDelete = company.carouselImages.find(
        (img: any) => img._id?.toString() === imageId
      );

      if (imageToDelete && imageToDelete.url) {
        const normalizedPath = imageToDelete.url.replace(/^[\/\\]+/, "");
        const isExternal = /^https?:\/\//i.test(imageToDelete.url) || imageToDelete.url.startsWith("data:");

        if (!isExternal && normalizedPath) {
          try {
            const filepath = path.join(process.cwd(), "public", normalizedPath);
            await fs.unlink(filepath);
            // console.log("Deleted carousel image file:", filepath);
          } catch (unlinkError) {
            console.error("Failed to delete carousel image file:", unlinkError);
            // Continue even if file deletion fails
          }
        }
      }

      // Remove image from carousel array
      company.carouselImages = company.carouselImages.filter(
        (img: any) => img._id?.toString() !== imageId
      );
    }

    company.markModified("carouselImages");
    await company.save();

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error deleting carousel image:", error);
    return NextResponse.json(
      { error: "Failed to delete carousel image" },
      { status: 500 }
    );
  }
}
