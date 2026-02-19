import { connectDB } from "@/lib/db"
import { Blog } from "@/lib/models/blog"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const company = searchParams.get("company")
    const tag = searchParams.get("tag")
    const all = searchParams.get("all")

    await connectDB()

    const session = await getServerSession()
    const user = session?.user?.email ? await User.findOne({ email: session.user.email }) : null

    const query: any = all && user?.role === "admin" ? {} : { isPublished: true }

    if (company) {
      query.company = company
    }

    if (tag) {
      query.tags = tag
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .populate("author", "name")
      .populate("company", "name slug")

    return NextResponse.json(blogs)
  } catch (error) {
    // console.error("Error fetching blogs:", error)
    return NextResponse.json({ error: "Failed to fetch blogs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    
    // ADD LOGGING
    console.log("========== BLOG CREATE DEBUG ==========")
    console.log("Received data:", JSON.stringify(body, null, 2))
    console.log("Image value:", body.image)
    console.log("Image type:", typeof body.image)
    console.log("=====================================")

    const { title, slug, content, excerpt, image, tags, isPublished, company } = body

    // Validate required fields
    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required" },
        { status: 400 }
      )
    }

    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt: excerpt || "",
      image: image || "", // Make sure this is being passed
      tags: tags || [],
      isPublished: isPublished || false,
      company: company || null,
      author: user._id,
    })

    console.log("Created blog with image:", blog.image)

    return NextResponse.json(blog)
  } catch (error) {
    console.error("Error creating blog:", error)
    return NextResponse.json({ error: "Failed to create blog" }, { status: 500 })
  }
}
