import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const query = all ? {} : { isActive: true };
    const companies = await Company.find(query).sort({ position: 1, name: 1 });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // ⚠️ SECURITY CHECK: Only admins can create companies
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      name,
      slug,
      description,
      logo,
      banner,
      email,
      phone,
      website,
      isActive,
    } = body;

    // Get the highest position currently in use
    const lastCompany = await Company.findOne({}).sort({ position: -1 });
    const nextPosition = (lastCompany?.position || 0) + 1;

    const company = new Company({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
      logo,
      banner,
      email,
      phone,
      website,
      isActive: isActive ?? true,
      position: nextPosition,
    });

    await company.save();

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
