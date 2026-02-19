import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// PUT - Update New Arrivals settings
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { isVisible, limit } = body;

    if (limit !== undefined && limit <= 0) {
      return NextResponse.json(
        { error: "Limit must be greater than 0" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      $set: {},
    };

    if (isVisible !== undefined) {
      updateData.$set["newArrivalsSettings.isVisible"] = isVisible;
    }

    if (limit !== undefined) {
      updateData.$set["newArrivalsSettings.limit"] = limit;
    }

    if (Object.keys(updateData.$set).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedCompany = await Company.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    console.log(
      "New Arrivals settings updated:",
      updatedCompany.newArrivalsSettings,
      "Company ID:",
      updatedCompany._id
    );

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: updatedCompany.newArrivalsSettings,
    });
  } catch (error) {
    console.error("Error updating new arrivals settings:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to update new arrivals settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
