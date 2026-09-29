import { withCORS } from "@/lib/cors";
import { NextResponse } from "next/server";
import { allowResetCheck, checkResetOtp, RESET_OTP_INVALID_MESSAGE } from "@/lib/reset-otp";

export async function POST(req: Request) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return withCORS(NextResponse.json({ error: "Email and OTP are required" }, { status: 400 }));
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!allowResetCheck(req, normalizedEmail)) {
      return withCORS(
        NextResponse.json(
          { error: "Too many attempts. Please wait a few minutes and try again." },
          { status: 429, headers: { "Retry-After": "900" } }
        )
      );
    }

    // OTP is not cleared here — reset-password checks it again and clears it.
    const user = await checkResetOtp(normalizedEmail, otp);
    if (!user) {
      return withCORS(NextResponse.json({ error: RESET_OTP_INVALID_MESSAGE }, { status: 400 }));
    }

    return withCORS(NextResponse.json({ message: "OTP verified successfully" }));
  } catch (err) {
    console.error("[VERIFY_RESET_OTP]", err);
    return withCORS(NextResponse.json({ error: "Something went wrong" }, { status: 500 }));
  }
}
