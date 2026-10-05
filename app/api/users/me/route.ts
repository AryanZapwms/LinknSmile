// app/api/users/me/route.ts
// DELETE: self-service account deletion (lib/account-deletion.ts).
// Body: { confirm: "DELETE", password } — password is required for
// accounts that have one; Google-only accounts just confirm.

import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyPassword } from "@/lib/auth";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiError } from "@/lib/api-error";
import { rateLimit } from "@/lib/rate-limit";
import Shop from "@/lib/models/shop";
import { openOrderCount, deleteAccount } from "@/lib/account-deletion";
import { exitVendor } from "@/lib/vendor-exit";
import { deleteAccountRequest } from "@/lib/contracts/users";

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return apiError("UNAUTHORIZED", "Unauthorized", 401);

  // Password re-entry is guessable: 5 attempts per 15 minutes per account.
  if (!rateLimit("account-delete", user.id, { limit: 5, windowMs: 15 * 60_000 }).success) {
    return apiError("RATE_LIMITED", "Too many attempts. Please try again later.", 429, {}, { "Retry-After": "900" });
  }

  const parsed = deleteAccountRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError("CONFIRMATION_REQUIRED", 'Send { "confirm": "DELETE" } to delete your account.', 400);
  }

  try {
    await connectDB();
    const doc = await User.findById(user.id).select("password role shopId email isActive").lean<any>();
    if (!doc || doc.isActive === false) return apiError("UNAUTHORIZED", "Unauthorized", 401);
    if (doc.role === "admin") {
      return apiError("FORBIDDEN", "Admin accounts must be removed by another admin.", 403);
    }
    if (doc.password) {
      const ok = parsed.data.password ? await verifyPassword(parsed.data.password, doc.password) : false;
      if (!ok) return apiError("INVALID_CREDENTIALS", "Password is incorrect.", 403);
    }

    const shop = await Shop.findOne({ ownerId: user.id }).select("_id").lean<{ _id: unknown }>();
    const shopId = shop ? String(shop._id) : doc.shopId ? String(doc.shopId) : null;
    const openOrders = await openOrderCount(user.id, shopId);
    if (openOrders > 0) {
      return apiError(
        "OPEN_ORDERS",
        "You have orders that are still in progress. You can delete your account once they are delivered or cancelled.",
        409,
        { openOrders }
      );
    }

    // Vendors leave through the vendor exit flow first (final settlement,
    // shop archived, wallet closed). Idempotent, so a retry after a later
    // failure doesn't settle twice.
    if (shop) {
      const exit = await exitVendor(user.id);
      if (!exit.ok) return apiError(exit.code, exit.message, 409);
    }

    await deleteAccount({ userId: user.id, shopId, email: doc.email });
    return withCORS(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("[account-deletion] failed:", error);
    return apiError("INTERNAL_ERROR", "Could not delete the account. Please retry or contact support.", 500);
  }
}
