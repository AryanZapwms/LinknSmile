import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get all companies sorted by name (original order before position was added)
    const companies = await Company.find({}).sort({ createdAt: 1, name: 1 });

    console.log(`Migrating ${companies.length} companies with proper positions...`);

    // Update each company with its index as position
    const updates = await Promise.all(
      companies.map((company, index) => {
        console.log(`Setting ${company.name} to position ${index}`);
        return Company.updateOne(
          { _id: company._id },
          { $set: { position: index } },
          { new: true }
        );
      })
    );

    // Verify the updates
    const verifyCompanies = await Company.find({}).sort({ position: 1, name: 1 });
    console.log(
      "Verified positions:",
      verifyCompanies.map((c) => ({ name: c.name, position: c.position }))
    );

    return NextResponse.json(
      {
        message: `Successfully migrated ${companies.length} companies`,
        companies: verifyCompanies.map((c) => ({ name: c.name, position: c.position })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error migrating companies:", error);
    return NextResponse.json(
      { error: "Failed to migrate companies", details: String(error) },
      { status: 500 }
    );
  }
}