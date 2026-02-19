import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      console.warn("Unauthorized reorder attempt - no admin session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { companies } = body;

    if (!Array.isArray(companies) || companies.length === 0) {
      console.error("Invalid companies array received:", body);
      return NextResponse.json(
        { error: "Invalid companies array" },
        { status: 400 }
      );
    }

    console.log(`\n=== REORDERING ${companies.length} COMPANIES ===`);

    // Update positions for all companies using updateOne for better reliability
    const updateResults = await Promise.all(
      companies.map((company, index) => {
        console.log(`→ Updating ${company.name} (ID: ${company._id}) to position ${index}`);
        return Company.updateOne(
          { _id: company._id },
          { $set: { position: index } },
          { new: true }
        );
      })
    );

    console.log(`✓ Update operations completed: ${JSON.stringify(updateResults)}`);

    // Fetch and verify the updated companies
    const verifyCompanies = await Company.find({}).sort({ position: 1, name: 1 });
    console.log("=== VERIFICATION ===");
    verifyCompanies.forEach((c, i) => {
      console.log(`${i}: ${c.name} (position: ${c.position})`);
    });
    console.log("=== END VERIFICATION ===\n");

    return NextResponse.json(
      {
        message: "Companies reordered successfully",
        companies: verifyCompanies.map(c => ({ _id: c._id, name: c.name, position: c.position }))
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error reordering companies:", error);
    return NextResponse.json(
      { error: "Failed to reorder companies", details: String(error) },
      { status: 500 }
    );
  }
}