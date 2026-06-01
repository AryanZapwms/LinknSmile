import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models/category";
import { NextResponse } from "next/server";

const NEW_CATEGORIES = [
  "Organic products online",
  "Handmade products",
  "Homemade products",
  "Natural products",
  "Eco-friendly products",
  "Organic food online",
  "Handmade crafts",
  "Artisan products",
  "Chemical-free products",
  "Sustainable shopping"
];

export async function GET() {
  if (request.method === 'OPTIONS') {
    return withCORS(new NextResponse(null));
  }

  try {
    await connectDB();

    // 1. Clear existing categories
    const deleteResult = await Category.deleteMany({});

    // 2. Insert new categories
    const categoriesToInsert = NEW_CATEGORIES.map(name => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      isActive: true
    }));

    const inserted = await Category.insertMany(categoriesToInsert);

    return withCORS(NextResponse.json({
      success: true,
      deleted: deleteResult.deletedCount,
      inserted: inserted.length,
      categories: inserted.map(c => c.name)
    }));
  } catch (error: any) {
    return withCORS(NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 }));
  }
}
