import { withCORS } from "@/lib/cors";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/get-auth-user";
import { exitVendor } from "@/lib/vendor-exit";

// Vendor leaves the platform — rules live in lib/vendor-exit.ts (shared with
// vendor self-deletion). Errors are { error, code }; success { success, message }.
export async function POST(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const result = await exitVendor(session.user.id);
    if (!result.ok) {
      return withCORS(
        NextResponse.json({ error: result.message, code: result.code }, { status: result.status })
      );
    }
    return withCORS(NextResponse.json({ success: true, message: result.message }));
  } catch (error: any) {
    console.error("Vendor exit error:", error);
    return withCORS(
      NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    );
  }
}
