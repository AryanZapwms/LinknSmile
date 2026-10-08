import { withCORS } from "@/lib/cors";
import { CURRENT_MOU_VERSION } from "@/lib/mou-content";
import { sendMouReminders, type MouReminderTarget } from "@/lib/vendor-mou-tracking";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

const MAX_SHOP_IDS = 100;
const OBJECT_ID = /^[a-f\d]{24}$/i;

// POST /api/admin/vendors/mou/remind
//   { shopIds: string[] }  — these shops (1 to MAX_SHOP_IDS)
//   { all: true }          — every vendor who hasn't accepted the current MOU
//
// Always answers 200 with one result per vendor (sent / failed / skipped
// and why); who is actually emailed is decided server-side — see
// sendMouReminders in lib/vendor-mou-tracking.ts.
export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    const body = await request.json().catch(() => null);
    let target: MouReminderTarget | null = null;
    if (body?.all === true && body.shopIds === undefined) {
      target = { all: true };
    } else if (body?.all === undefined && Array.isArray(body?.shopIds)) {
      const shopIds = [...new Set<unknown>(body.shopIds)];
      const valid =
        shopIds.length >= 1 &&
        shopIds.length <= MAX_SHOP_IDS &&
        shopIds.every((id) => typeof id === "string" && OBJECT_ID.test(id));
      if (valid) target = { shopIds: shopIds as string[] };
    }
    if (!target) {
      return withCORS(
        NextResponse.json(
          {
            message: `Send either { "all": true } or { "shopIds": [...] } with 1 to ${MAX_SHOP_IDS} shop ids`,
          },
          { status: 400 }
        )
      );
    }

    const run = await sendMouReminders(target, { performedBy: session.user.id });

    return withCORS(NextResponse.json({ success: true, mouVersion: CURRENT_MOU_VERSION, ...run }));
  } catch (error: any) {
    console.error("Admin send vendor MOU reminders error:", error);
    return withCORS(
      NextResponse.json(
        { message: "Failed to send MOU reminders", error: error.message },
        { status: 500 }
      )
    );
  }
}
