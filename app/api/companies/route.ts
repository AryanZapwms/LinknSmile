// app/api/companies/route.ts
import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const query = all ? {} : { isActive: true };

    const companies = await Company.find(query).select("name slug").sort({ name: 1 });

    return withCORS(NextResponse.json(companies));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 }));
  }
}
