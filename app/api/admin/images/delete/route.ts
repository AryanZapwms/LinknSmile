import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { Blog } from "@/lib/models/blog"
import { Company } from "@/lib/models/company"

const PUBLIC_DIR = path.join(process.cwd(), "public")

export async function DELETE(request: NextRequest) {
  try {
    const { path: imagePath } = await request.json()

    if (!imagePath) {
      return NextResponse.json(
        { success: false, error: "Image path is required" },
        { status: 400 }
      )
    }

    // Validate path - must start with / and be in allowed folders
    if (!imagePath.startsWith("/")) {
      return NextResponse.json(
        { success: false, error: "Invalid image path" },
        { status: 400 }
      )
    }

    // Check if image is still being used
    await connectDB()

    const fullImagePath = `${PUBLIC_DIR}${imagePath}`

    // Verify file exists
    if (!fs.existsSync(fullImagePath)) {
      return NextResponse.json(
        { success: false, error: "Image file not found" },
        { status: 404 }
      )
    }

    // Check if image is used in products
    const productUsage = await Product.find({
      $or: [
        { image: imagePath },
        { images: imagePath },
        { "results.image": imagePath }
      ]
    }).countDocuments()

    // Check if image is used in blogs
    const blogUsage = await Blog.find({ image: imagePath }).countDocuments()

    // Check if image is used in companies
    const companyUsage = await Company.find({
      $or: [
        { logo: imagePath },
        { banner: imagePath },
        { "carouselImages.url": imagePath },
        { "newArrivals.image": imagePath },
        { "shopByConcern.image": imagePath }
      ]
    }).countDocuments()

    const totalUsage = productUsage + blogUsage + companyUsage

    if (totalUsage > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Image is still being used and cannot be deleted",
          usage: {
            products: productUsage,
            blogs: blogUsage,
            companies: companyUsage,
          }
        },
        { status: 400 }
      )
    }

    // Delete the file
    fs.unlinkSync(fullImagePath)

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
      path: imagePath
    })

  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete image" },
      { status: 500 }
    )
  }
}