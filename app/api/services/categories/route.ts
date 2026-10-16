// app/api/services/categories/route.ts
//
// GET — the service categories in display order, each with its names in
// every language and its slug. Public and read-only. Not tied to the
// Services switch: vendors choose a category on their Store Page before the
// page is switched on.
import { withCORS } from "@/lib/cors";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ServiceCategory } from "@/lib/models/service-category";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    await connectDB();
    const categories = await ServiceCategory.find()
      .sort({ sortOrder: 1, createdAt: 1 })
      .select("name slug")
      .lean();
    return withCORS(
      NextResponse.json({
        categories: categories.map((c) => ({
          _id: String(c._id),
          name: { en: c.name?.en ?? "", ar: c.name?.ar ?? "", hi: c.name?.hi ?? "" },
          slug: c.slug,
        })),
      })
    );
  } catch (error) {
    console.error("Service categories error:", error);
    return apiError("INTERNAL_ERROR", "Failed to load categories", 500);
  }
}
