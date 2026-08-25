// app/api/vendor/coupons/route.ts
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
  const { code, discountType, discountValue, minOrderValue, maxDiscountAmount, usageLimit, perUserLimit, validFrom, validUntil } =
    body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return "Coupon code is required";
  }
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

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();
    const shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);
    if (!shopId) {
      return withCORS(
        NextResponse.json(
          { message: "Shop ID not found. Please complete vendor setup." },
          { status: 404 }
        )
      );
    }

    const coupons = await Coupon.find({ shopId }).sort({ createdAt: -1 }).lean();

    return withCORS(NextResponse.json({ success: true, coupons }));
  } catch (error: any) {
    console.error("Vendor coupons fetch error:", error);
    return withCORS(
      NextResponse.json({ message: "Failed to fetch coupons", error: error.message }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }
    if (session.user.role !== "shop_owner") {
      return withCORS(
        NextResponse.json({ message: "Unauthorized - not a shop owner" }, { status: 401 })
      );
    }

    await connectDB();
    const Shop = (await import("@/lib/models/shop")).default;
    const shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);
    if (!shopId) {
      return withCORS(
        NextResponse.json(
          { message: "Shop ID not found. Please complete vendor setup." },
          { status: 401 }
        )
      );
    }

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isApproved) {
      return withCORS(
        NextResponse.json(
          {
            message:
              "Your shop is pending approval. You can only create coupons after your shop is approved.",
          },
          { status: 403 }
        )
      );
    }

    const access = await getShopSubscriptionAccessState(shopId);
    if (access.isBlocked) {
      return withCORS(
        NextResponse.json(
          { message: "Your subscription has expired. Renew it to create or edit coupons." },
          { status: 403 }
        )
      );
    }

    const body = await req.json();
    const validationError = validateCouponInput(body);
    if (validationError) {
      return withCORS(NextResponse.json({ message: validationError }, { status: 400 }));
    }

    const code = body.code.trim().toUpperCase();
    const existing = await Coupon.findOne({ shopId, code });
    if (existing) {
      return withCORS(
        NextResponse.json({ message: "You already have a coupon with this code" }, { status: 400 })
      );
    }

    const coupon = await Coupon.create({
      shopId,
      code,
      discountType: body.discountType,
      discountValue: body.discountValue,
      minOrderValue: body.minOrderValue || 0,
      maxDiscountAmount: body.maxDiscountAmount || undefined,
      usageLimit: body.usageLimit || undefined,
      perUserLimit: body.perUserLimit || undefined,
      validFrom: body.validFrom || undefined,
      validUntil: body.validUntil || undefined,
      isActive: body.isActive ?? true,
    });

    return withCORS(NextResponse.json({ success: true, coupon }));
  } catch (error: any) {
    console.error("Coupon creation error:", error);
    return withCORS(
      NextResponse.json({ message: "Failed to create coupon", error: error.message }, { status: 500 })
    );
  }
}
