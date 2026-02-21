import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

// ---------------- GET PRODUCT ----------------
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; //  await params

    await connectDB();

    // console.log(" GET /api/products/:id - Fetching product:", id);

    const product = await Product.findById(id)
      .populate("category", "name slug")
      .populate("shopId", "shopName commissionRate")
      .lean();

    if (!product) {
      console.warn("⚠️ Product not found:", id);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productObj = product;
    const populatedProduct = {
      ...productObj,
      category: product.category || {
        name: "Uncategorized",
        slug: "uncategorized",
      },
    };

    // console.log(" Final response:", JSON.stringify(populatedProduct, null, 2));

    return NextResponse.json(populatedProduct);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}



// ---------------- UPDATE PRODUCT ----------------
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; //  await params
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    // console.log(" PUT /api/products/:id - Received:", JSON.stringify(body, null, 2));

    const {
      name,
      slug,
      description,
      price,
      discountPrice,
      image,
      images,
      category,
      stock,
      sku,
      ingredients,
      benefits,
      usage,
      suitableFor,
      results,
      sizes,
      isActive,
    } = body;

    const updateData = {
      name,
      slug,
      description,
      price,
      discountPrice,
      image: image || (images && images.length > 0 ? images[0] : undefined),
      images: images || (image ? [image] : []),
      category,
      stock,
      sku,
      ingredients,
      benefits,
      usage,
      suitableFor,
      results,
      sizes,
      isActive,
    };

    const product = await Product.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updatedProduct = product.toObject ? product.toObject() : product;

    const responseData = {
      ...updatedProduct,
      category: product.category || { name: "Uncategorized", slug: "uncategorized" },
    };

    console.log(" Product updated successfully:", id);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// ---------------- DELETE PRODUCT ----------------
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; //  await params
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    await connectDB();

    // console.log(" DELETE /api/products/:id - Deleting:", id);

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      console.warn("⚠️ Product not found for deletion:", id);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // console.log(" Product deleted:", product._id);
    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
