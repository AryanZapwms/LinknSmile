import { withCORS } from "@/lib/cors";
import { sendEmail, getOrderConfirmationEmail } from "@/lib/email";
import { resolveEmailLocale } from "@/lib/email-locale";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    // Admin-only: this route lets the caller pick any recipient and subject,
    // so it must not be open to ordinary users. Role is read from the DB, not
    // the session token, so a demoted admin loses access immediately.
    const requester = await User.findById(session.user.id).select("locale role").lean<{
      locale?: string;
      role?: string;
    }>();
    if (requester?.role !== "admin") {
      return withCORS(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const body = await request.json();
    const { type, to, subject, data } = body;
    const locale = resolveEmailLocale(requester?.locale);

    let html = "";

    switch (type) {
      case "order-confirmation":
        html = await getOrderConfirmationEmail({ ...data, locale });
        break;
      default:
        return withCORS(NextResponse.json({ error: "Invalid email type" }, { status: 400 }));
    }

    const result = await sendEmail({
      to,
      subject,
      html,
    });

    if ((result as any).success) {
      return withCORS(NextResponse.json({ success: true, messageId: (result as any).messageId }));
    } else {
      return withCORS(NextResponse.json({ error: (result as any).error }, { status: 500 }));
    }
  } catch (error) {
    console.error("[v0] Email API error:", error);
    return withCORS(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to send email" },
        { status: 500 }
      )
    );
  }
}

