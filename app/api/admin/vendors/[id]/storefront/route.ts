// app/api/admin/vendors/[id]/storefront/route.ts
//
// PUT (multipart/form-data) — an admin edits any shop's public page. Same
// fields and rules as the vendor's own route (app/api/vendor/storefront,
// lib/shop-storefront.ts). Each change is recorded in AuditLog.
import mongoose from "mongoose";
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/lib/models/audit-log";
import { apiError, clientIp } from "@/lib/api-error";
import { readStorefrontForm, saveStorefront, type StorefrontFailure } from "@/lib/shop-storefront";

const failure = ({ code, message, status, field, reason }: StorefrontFailure) =>
  apiError(code, message, status, { message, field, reason });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const form = await readStorefrontForm(req);
    if (!form.ok) return failure(form);

    const result = await saveStorefront(id, form.input);
    if (!result.ok) return failure(result);

    if (result.changed.length > 0) {
      const pick = (fields: typeof result.shop) =>
        Object.fromEntries(result.changed.map((key) => [key, fields[key]]));
      const shopId = new mongoose.Types.ObjectId(result.shop._id);
      await AuditLog.create({
        action: "SHOP_STOREFRONT_UPDATED",
        performedBy: session.user.id,
        targetEntity: "Shop",
        targetId: shopId,
        shopId,
        before: pick(result.before),
        after: pick(result.shop),
        ipAddress: clientIp(req),
      });
    }

    return withCORS(
      NextResponse.json({ success: true, message: "Store page updated", shop: result.shop })
    );
  } catch (error) {
    console.error("Update shop storefront (admin) error:", error);
    return apiError("INTERNAL_ERROR", "Failed to update store page", 500, {
      message: "Failed to update store page",
    });
  }
}
