// app/api/vendor/coupons/[id]/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { Coupon } from "@/lib/models/coupon";
import { getShopSubscriptionAccessState } from "@/lib/vendor-subscription-status";

async function getShopIdForUser(userId: string, sessionShopId?: string) {
  await connectDB();
  const Shop = (await import("@/lib/models/shop")).default;
  if (sessionShopId) return sessionShopId;
  const shop = await Shop.findOne({ ownerId: userId });
  return (shop?._id as any)?.toString();
}

const VALID_DISCOUNT_TYPES = ["percentage", "fixed"] as const;

function validateCouponInput(body: any): string | null {
  const { discountType, discountValue, minOrderValue, maxDiscountAmount, usageLimit, perUserLimit, validFrom, validUntil } =
    body;

  if (!VALID_DISCOUNT_TYPES.includes(discountType)) {
    return "Discount type must be 'percentage' or 'fixed'";
  }
  if (typeof discountValue !== "number" || discountValue <= 0) {
    return "Discount value must be a positive number";
  }
  if (discountType === "percentage" && discountValue > 100) {
    return "A percentage discount can't exceed 100";
  }
  if (minOrderValue !== undefined && minOrderValue !== null && (typeof minOrderValue !== "number" || minOrderValue < 0)) {
    return "Minimum order value must be a non-negative number";
  }
  if (
    maxDiscountAmount !== undefined &&
    maxDiscountAmount !== null &&
    (typeof maxDiscountAmount !== "number" || maxDiscountAmount <= 0)
  ) {
    return "Max discount amount must be a positive number";
  }
  if (usageLimit !== undefined && usageLimit !== null && (typeof usageLimit !== "number" || usageLimit <= 0 || !Number.isInteger(usageLimit))) {
    return "Usage limit must be a positive whole number";
  }
  if (
    perUserLimit !== undefined &&
    perUserLimit !== null &&
    (typeof perUserLimit !== "number" || perUserLimit <= 0 || !Number.isInteger(perUserLimit))
  ) {
    return "Per-user limit must be a positive whole number";
  }
  if (validFrom && validUntil && new Date(validFrom) > new Date(validUntil)) {
    return "Valid-from date must be before the valid-until date";
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);
    const { id } = await params;

    const coupon = await Coupon.findOne({ _id: id, shopId });
    if (!coupon) {
      return withCORS(NextResponse.json({ message: "Coupon not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json({ success: true, coupon }));
  } catch (error: any) {
    console.error("Vendor coupon fetch error:", error);
    return withCORS(
      NextResponse.json({ message: "Failed to fetch coupon", error: error.message }, { status: 500 })
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);
    const { id } = await params;

    const access = await getShopSubscriptionAccessState(shopId);
    if (access.isBlocked) {
      return withCORS(
        NextResponse.json(
          { message: "Your subscription has expired. Renew it to create or edit coupons." },
          { status: 403 }
        )
      );
    }

    const coupon = await Coupon.findOne({ _id: id, shopId });
    if (!coupon) {
      return withCORS(NextResponse.json({ message: "Coupon not found" }, { status: 404 }));
    }

    const body = await req.json();
    const validationError = validateCouponInput(body);
    if (validationError) {
      return withCORS(NextResponse.json({ message: validationError }, { status: 400 }));
    }

    // Code itself is intentionally not editable — changing it after
    // customers may already know it invites confusion; delete + recreate
    // if a vendor genuinely needs a different code.
    coupon.discountType = body.discountType;
    coupon.discountValue = body.discountValue;
    coupon.minOrderValue = body.minOrderValue || 0;
    coupon.maxDiscountAmount = body.maxDiscountAmount || undefined;
    coupon.usageLimit = body.usageLimit || undefined;
    coupon.perUserLimit = body.perUserLimit || undefined;
    coupon.validFrom = body.validFrom || undefined;
    coupon.validUntil = body.validUntil || undefined;
    if (body.isActive !== undefined) coupon.isActive = body.isActive;

    await coupon.save();

    return withCORS(NextResponse.json({ success: true, coupon }));
  } catch (error: any) {
    console.error("Coupon update error:", error);
    return withCORS(
      NextResponse.json({ message: "Failed to update coupon", error: error.message }, { status: 500 })
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);
    const { id } = await params;

    // Deletion is deliberately NOT gated by subscription-blocked status,
    // matching the existing vendor/products/[id] DELETE precedent (§16 of
    // PROJECT_SOURCE_OF_TRUTH.md) — a blocked vendor can still remove their
    // own coupons.
    const deleted = await Coupon.findOneAndDelete({ _id: id, shopId });
    if (!deleted) {
      return withCORS(NextResponse.json({ message: "Coupon not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json({ success: true }));
  } catch (error: any) {
    console.error("Coupon delete error:", error);
    return withCORS(
      NextResponse.json({ message: "Failed to delete coupon", error: error.message }, { status: 500 })
    );
  }
}
