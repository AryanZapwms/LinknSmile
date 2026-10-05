// app/api/vendor/apply/intent/route.ts
// Marks that a signed-in customer has started (but not finished) the vendor
// application flow, so the profile page can show a "finish setting up your
// vendor account" reminder.
import { withCORS } from "@/lib/cors";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { getAuthSession } from "@/lib/get-auth-user";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    await User.updateOne(
      { _id: session.user.id, role: "user" },
      { $set: { pendingVendorApplication: true } }
    );

    return withCORS(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("Error marking vendor application intent:", error);
    return withCORS(NextResponse.json({ error: "Failed to update" }, { status: 500 }));
  }
}
