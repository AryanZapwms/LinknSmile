import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type ParamType = { params: Promise<{ id: string }> };

type SettingsPayload = {
  isVisible: boolean;
  limit: number;
};

export async function PUT(request: Request, { params }: ParamType) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body: SettingsPayload = await request.json();
    const { isVisible, limit } = body;

    if (typeof isVisible !== "boolean" || typeof limit !== "number") {
      return NextResponse.json(
        { error: "isVisible (boolean) and limit (number) are required" },
        { status: 400 }
      );
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      {
        $set: {
          shopByConcernSettings: {
            isVisible,
            limit,
          },
        },
      },
      { new: true }
    );

    if (!updatedCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Shop by Concern settings updated",
      settings: updatedCompany.shopByConcernSettings,
    });
  } catch (error) {
    console.error("Error updating shop by concern settings:", error);
    return NextResponse.json(
      {
        error: "Failed to update shop by concern settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
