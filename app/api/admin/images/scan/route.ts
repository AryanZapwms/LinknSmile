import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { connectDB } from "@/lib/db" 
import { Product } from "@/lib/models/product"
import { Blog } from "@/lib/models/blog"
import { Company } from "@/lib/models/company"

const PUBLIC_DIR = path.join(process.cwd(), "public")
const IMAGE_FOLDERS = ["arrivals", "blogs", "carousel", "shop-by-concern", "uploads"]

interface ImageFile {
  path: string
  folder: string
  filename: string
  size: number
  isUsed: boolean
  usedBy: string[]
}

function getAllImageFiles(): ImageFile[] {
  const images: ImageFile[] = []

  for (const folder of IMAGE_FOLDERS) {
    const folderPath = path.join(PUBLIC_DIR, folder)

    if (!fs.existsSync(folderPath)) continue

    const files = fs.readdirSync(folderPath)

    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const stat = fs.statSync(filePath)

      // Only include image files
      if (stat.isFile() && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
        images.push({
          path: `/${folder}/${file}`,
          folder,
          filename: file,
          size: stat.size,
          isUsed: false,
          usedBy: [],
        })
      }
    }
  }

  return images
}

async function checkImageUsage(images: ImageFile[]): Promise<ImageFile[]> {
  await connectDB()

  // Get all products
  const products = await Product.find({}, "image images results").lean()

  // Get all blogs
  const blogs = await Blog.find({}, "image").lean()

  // Get all companies
  const companies = await Company.find({}, "logo banner carouselImages newArrivals shopByConcern").lean()

  // Create a map for quick lookup
  const imageMap = new Map<string, ImageFile>()
  images.forEach(img => imageMap.set(img.path, img))

  // Check products
  for (const product of products) {
    // Check main image
    if (product.image && imageMap.has(product.image)) {
      const img = imageMap.get(product.image)!
      img.isUsed = true
      img.usedBy.push(`Product: ${product.name || product._id}`)
    }

    // Check images array
    if (product.images) {
      for (const imgPath of product.images) {
        if (imageMap.has(imgPath)) {
          const img = imageMap.get(imgPath)!
          img.isUsed = true
          img.usedBy.push(`Product: ${product.name || product._id}`)
        }
      }
    }

    // Check results images
    if (product.results) {
      for (const result of product.results) {
        if (result.image && imageMap.has(result.image)) {
          const img = imageMap.get(result.image)!
          img.isUsed = true
          img.usedBy.push(`Product: ${product.name || product._id}`)
        }
      }
    }
  }

  // Check blogs
  for (const blog of blogs) {
    if (blog.image && imageMap.has(blog.image)) {
      const img = imageMap.get(blog.image)!
      img.isUsed = true
      img.usedBy.push(`Blog: ${blog.title || blog._id}`)
    }
  }

  // Check companies
  for (const company of companies) {
    // Check logo
    if (company.logo && imageMap.has(company.logo)) {
      const img = imageMap.get(company.logo)!
      img.isUsed = true
      img.usedBy.push(`Company: ${company.name || company._id}`)
    }

    // Check banner
    if (company.banner && imageMap.has(company.banner)) {
      const img = imageMap.get(company.banner)!
      img.isUsed = true
      img.usedBy.push(`Company: ${company.name || company._id}`)
    }

    // Check carousel images
    if (company.carouselImages) {
      for (const carouselImg of company.carouselImages) {
        if (carouselImg.url && imageMap.has(carouselImg.url)) {
          const img = imageMap.get(carouselImg.url)!
          img.isUsed = true
          img.usedBy.push(`Company: ${company.name || company._id}`)
        }
      }
    }

    // Check new arrivals
    if (company.newArrivals) {
      for (const arrival of company.newArrivals) {
        if (arrival.image && imageMap.has(arrival.image)) {
          const img = imageMap.get(arrival.image)!
          img.isUsed = true
          img.usedBy.push(`Company: ${company.name || company._id}`)
        }
      }
    }

    // Check shop by concern
    if (company.shopByConcern) {
      for (const concern of company.shopByConcern) {
        if (concern.image && imageMap.has(concern.image)) {
          const img = imageMap.get(concern.image)!
          img.isUsed = true
          img.usedBy.push(`Company: ${company.name || company._id}`)
        }
      }
    }
  }

  return Array.from(imageMap.values())
}

export async function GET(request: NextRequest) {
  try {
    // Get all image files
    const images = getAllImageFiles()

    // Check which images are used
    const imagesWithUsage = await checkImageUsage(images)

    return NextResponse.json({
      success: true,
      images: imagesWithUsage,
      total: imagesWithUsage.length,
      used: imagesWithUsage.filter(img => img.isUsed).length,
      unused: imagesWithUsage.filter(img => !img.isUsed).length,
    })
  } catch (error) {
    console.error("Error scanning images:", error)
    return NextResponse.json(
      { success: false, error: "Failed to scan images" },
      { status: 500 }
    )
  }
}