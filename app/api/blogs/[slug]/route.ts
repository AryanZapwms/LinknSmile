// app\api\blogs\[slug]\route.ts
import { connectDB } from "@/lib/db"
import { Blog } from "@/lib/models/blog"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB()

    // Await params before accessing slug
    const { slug } = await params

    const blog = await Blog.findOne({ slug, isPublished: true })
      .populate("author", "name email")
      .populate("company", "name slug")

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    return NextResponse.json(blog)
  } catch (error) {
    console.error("Error fetching blog:", error)
    return NextResponse.json({ error: "Failed to fetch blog" }, { status: 500 })
  }
}



export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 })
    }

    const { slug } = await params
    const body = await request.json()
    
    // ADD LOGGING
    console.log("========== BLOG UPDATE DEBUG ==========")
    console.log("Slug:", slug)
    console.log("Received data:", JSON.stringify(body, null, 2))
    console.log("Image value:", body.image)
    console.log("=====================================")

    const { title, content, excerpt, image, tags, isPublished, company } = body

    const blog = await Blog.findOneAndUpdate(
      { slug },
      { 
        title, 
        content, 
        excerpt, 
        image,  // Make sure this is included
        tags, 
        isPublished,
        company 
      },
      { new: true }
    )

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    console.log("Updated blog with image:", blog.image)

    return NextResponse.json(blog)
  } catch (error) {
    console.error("Error updating blog:", error)
    return NextResponse.json({ error: "Failed to update blog" }, { status: 500 })
  }
}











export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })

    // SECURITY CHECK: Only admins can delete blogs
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 })
    }

    // Await params before accessing slug
    const { slug } = await params

    const deletedBlog = await Blog.findOneAndDelete({ slug })

    if (!deletedBlog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    const imagePath = typeof deletedBlog.image === "string" ? deletedBlog.image.trim() : ""
    if (imagePath) {
      const isExternal = /^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")
      if (!isExternal) {
        const normalizedPath = imagePath.replace(/^[\/\\]+/, "")
        if (normalizedPath) {
          const absolutePath = path.join(process.cwd(), "public", normalizedPath)
          try {
            await fs.unlink(absolutePath)
          } catch (unlinkError) {
            console.error("Failed to delete blog image file:", unlinkError)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting blog:", error)
    return NextResponse.json({ error: "Failed to delete blog" }, { status: 500 })
  }
}