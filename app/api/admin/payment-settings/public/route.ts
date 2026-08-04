import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { PaymentSettings } from "@/lib/models/payment-settings";
import { connectDB } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }
  try {
    await connectDB();
    const settings = await PaymentSettings.findOne().lean() as any;
    return withCORS(
      NextResponse.json({
        enableCOD: settings?.enableCOD ?? true,
        enableRazorpay: settings?.enableRazorpay ?? true,
      })
    );
  } catch (error) {
    console.error("Error fetching public payment settings:", error);
    return withCORS(NextResponse.json({ enableCOD: true, enableRazorpay: true }));
  }
}