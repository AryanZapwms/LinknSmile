import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models/category";

import { User } from "@/lib/models/user";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const all = searchParams.get("all");
    const flat = searchParams.get("flat") === "true";

    let query: any = { isActive: true };



    if (all === "true") {
      query = {};
    }

    const categories = await Category.find(query)
      .setOptions({ strictPopulate: false })
      .populate("parent", "name slug")
      .sort({ createdAt: -1 });

    if (flat) {
      return NextResponse.json(categories);
    }

    // Build hierarchical structure
    const mainCategories = categories.filter((cat) => !cat.parent);
    const subCategories = categories.filter((cat) => cat.parent);

    const hierarchical = mainCategories.map((main) => ({
      ...main.toObject(),
      subCategories: subCategories.filter(
        (sub) => sub.parent && sub.parent._id.toString() === main._id.toString()
      ),
    }));

    return NextResponse.json(hierarchical);
  } catch (error) {
    // console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    //  SECURITY CHECK: Only admins can create categories
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, description, image, parent, isActive } = body;

    const category = new Category({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
      image,

      parent: parent || null,
      isActive: isActive ?? true,
    });

    await category.save();

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    // console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
