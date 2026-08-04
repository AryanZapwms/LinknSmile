import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { VendorSubscriptionSettings } from "@/lib/models/vendor-subscription-settings";

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    let settings = await VendorSubscriptionSettings.findOne();
    if (!settings) {
      settings = await VendorSubscriptionSettings.create({});
    }

    return withCORS(NextResponse.json(settings));
  } catch (error) {
    console.error("Error fetching vendor subscription settings:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to fetch subscription settings" }, { status: 500 })
    );
  }
}

export async function PUT(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const { annualFeeAmount, currency } = await request.json();
    if (typeof annualFeeAmount !== "number" || annualFeeAmount <= 0) {
      return withCORS(NextResponse.json({ error: "Invalid fee amount" }, { status: 400 }));
    }

    let settings = await VendorSubscriptionSettings.findOne();
    if (!settings) {
      settings = await VendorSubscriptionSettings.create({ annualFeeAmount, currency });
    } else {
      settings.annualFeeAmount = annualFeeAmount;
      if (currency) settings.currency = currency;
      await settings.save();
    }

    return withCORS(NextResponse.json(settings));
  } catch (error) {
    console.error("Error updating vendor subscription settings:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to update subscription settings" }, { status: 500 })
    );
  }
}
