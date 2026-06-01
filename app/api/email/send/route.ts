import { withCORS } from "@/lib/cors";
import { sendEmail, getOrderConfirmationEmail } from "@/lib/email"
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions)

    // Only allow authenticated requests
    if (!session) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    const body = await request.json()
    const { type, to, subject, data } = body

    let html = ""

    switch (type) {
      case "order-confirmation":
        html = getOrderConfirmationEmail(data)
        break
      default:
        return withCORS(NextResponse.json({ error: "Invalid email type" }, { status: 400 }))
    }

    const result = await sendEmail({
      to,
      subject,
      html,
    })

    if (result.success) {
      return withCORS(NextResponse.json({ success: true, messageId: result.messageId }))
    } else {
      return withCORS(NextResponse.json({ error: result.error }, { status: 500 }))
    }
  } catch (error) {
    console.error("[v0] Email API error:", error)
    return withCORS(NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 },
    ))
  }
}
