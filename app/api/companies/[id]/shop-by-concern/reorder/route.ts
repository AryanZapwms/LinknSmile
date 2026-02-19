import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type ParamType = { params: Promise<{ id: string }> };

type ReorderPayload = {
  itemIds: string[];
};

export async function PUT(request: Request, { params }: ParamType) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body: ReorderPayload = await request.json();
    const { itemIds } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "itemIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const concerns = company.shopByConcern || [];

    if (concerns.length === 0) {
      return NextResponse.json(
        { error: "No shop by concern entries to reorder" },
        { status: 400 }
      );
    }

    const concernMap = new Map();
    concerns.forEach((item: any) => {
      concernMap.set(item._id.toString(), item);
    });

    const reordered = [];
    for (let index = 0; index < itemIds.length; index++) {
      const concern = concernMap.get(itemIds[index]);
      if (concern) {
        concern.priority = index;
        reordered.push(concern);
      }
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      {
        $set: {
          shopByConcern: reordered,
        },
      },
      { new: true }
    );

    if (!updatedCompany) {
      return NextResponse.json(
        { error: "Failed to update company" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Shop by Concern reordered successfully",
      items: updatedCompany.shopByConcern,
    });
  } catch (error) {
    console.error("Error reordering shop by concern items:", error);
    return NextResponse.json(
      {
        error: "Failed to reorder shop by concern items",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
