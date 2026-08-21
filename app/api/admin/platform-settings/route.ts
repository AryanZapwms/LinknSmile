import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { PlatformSettings } from "@/lib/models/platform-settings";

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

    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    return withCORS(NextResponse.json(settings));
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return withCORS(NextResponse.json({ error: "Failed to fetch platform settings" }, { status: 500 }));
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

    const { supportEmail, supportPhone, brandTagline, taxRatePercent } = await request.json();

    if (typeof supportEmail !== "string" || !supportEmail.trim()) {
      return withCORS(NextResponse.json({ error: "Support email is required" }, { status: 400 }));
    }
    if (typeof supportPhone !== "string" || !supportPhone.trim()) {
      return withCORS(NextResponse.json({ error: "Support phone is required" }, { status: 400 }));
    }
    if (
      taxRatePercent !== undefined &&
      (typeof taxRatePercent !== "number" || taxRatePercent < 0 || taxRatePercent > 100)
    ) {
      return withCORS(
        NextResponse.json({ error: "Tax rate must be a number between 0 and 100" }, { status: 400 })
      );
    }

    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({
        supportEmail,
        supportPhone,
        brandTagline,
        taxRatePercent,
      });
    } else {
      settings.supportEmail = supportEmail;
      settings.supportPhone = supportPhone;
      if (brandTagline !== undefined) settings.brandTagline = brandTagline;
      if (taxRatePercent !== undefined) settings.taxRatePercent = taxRatePercent;
      await settings.save();
    }

    return withCORS(NextResponse.json(settings));
  } catch (error) {
    console.error("Error updating platform settings:", error);
    return withCORS(NextResponse.json({ error: "Failed to update platform settings" }, { status: 500 }));
  }
}
