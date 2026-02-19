import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const company = await Company.findById(id).populate({
      path: "shopByConcern.product",
      select: "name slug company",
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // ⚠️ SECURITY CHECK: Only admins can update companies
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
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
      shopByConcern,
    } = body;

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    company.name = name;
    company.slug = slug || name.toLowerCase().replace(/\s+/g, "-");
    company.description = description;
    company.logo = logo;
    company.banner = banner;
    company.email = email;
    company.phone = phone;
    company.website = website;
    company.isActive = isActive;

    if (Array.isArray(shopByConcern)) {
      company.shopByConcern = shopByConcern;
    }

    await company.save();

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // ⚠️ SECURITY CHECK: Only admins can delete companies
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const company = await Company.findByIdAndDelete(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
