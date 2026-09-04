import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import { AuditLog } from "@/lib/models/audit-log";
import { sendEmail, getVendorSubscriptionCancelledEmail } from "@/lib/email";
import { resolveEmailLocale } from "@/lib/email-locale";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await requireAdmin();
    if (!session) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const { shopId } = await params;
    await connectDB();

    const shop = await Shop.findById(shopId).populate("ownerId", "name email").lean();
    if (!shop) {
      return withCORS(NextResponse.json({ error: "Shop not found" }, { status: 404 }));
    }

    const subscription = await VendorSubscription.findOne({ shopId })
      .populate("compGrantedBy", "name email")
      .lean();

    return withCORS(NextResponse.json({ shop, subscription }));
  } catch (error) {
    console.error("Error fetching vendor subscription detail:", error);
    return withCORS(
      NextResponse.json({ error: "Failed to fetch subscription detail" }, { status: 500 })
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await requireAdmin();
    if (!session) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const { shopId } = await params;
    await connectDB();

    const body = await request.json();
    const { action } = body;

    if (action === "cancel") {
      const subscription = await VendorSubscription.findOne({ shopId });
      if (!subscription) {
        return withCORS(
          NextResponse.json({ error: "No subscription found for this shop" }, { status: 404 })
        );
      }

      const before = subscription.toObject();
      const { reason } = body;
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return withCORS(
          NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 })
        );
      }

      const cancelledAt = new Date();
      subscription.status = "cancelled";
      subscription.cancelledAt = cancelledAt;
      subscription.cancelledBy = session.user.id as any;
      subscription.cancellationReason = reason.trim();
      // The shared status helper derives storefrontHideDate as
      // expiryDate + 30d. Cancellation's 1-month decay is measured from
      // the cancellation date, not the original (possibly far-future)
      // expiryDate, so pin expiryDate to now — access is already blocked
      // immediately for cancellations regardless of this value.
      subscription.expiryDate = cancelledAt;
      await subscription.save();

      await AuditLog.create({
        action: "VENDOR_SUBSCRIPTION_CANCELLED",
        performedBy: session.user.id,
        targetEntity: "VendorSubscription",
        targetId: subscription._id,
        shopId,
        before,
        after: subscription.toObject(),
        reason: reason.trim(),
      });

      try {
        const shop = await Shop.findById(shopId)
          .populate("ownerId", "name email locale")
          .lean<any>();
        if (shop?.ownerId?.email) {
          await sendEmail({
            to: shop.ownerId.email,
            subject: `Subscription Cancelled - ${shop.shopName}`,
            html: await getVendorSubscriptionCancelledEmail({
              vendorName: shop.ownerId.name || "Vendor",
              shopName: shop.shopName,
              cancellationReason: reason.trim(),
              locale: resolveEmailLocale(shop.ownerId.locale),
            }),
          });
        }
      } catch (emailError) {
        console.error("Failed to send cancellation email:", emailError);
      }

      return withCORS(NextResponse.json({ success: true, subscription }));
    }

    if (action === "extend" || action === "grant_free") {
      // Unlike "cancel", these two upsert: an admin can comp a vendor who
      // has never once attempted to pay (no VendorSubscription doc yet —
      // create-order is the only other path that creates one).
      let subscription = await VendorSubscription.findOne({ shopId });
      const before = subscription ? subscription.toObject() : null;
      if (!subscription) {
        subscription = new VendorSubscription({
          shopId,
          status: "pending",
          amount: 0,
          paymentHistory: [],
        });
      }

      const now = new Date();
      const base =
        subscription.status === "active" && subscription.expiryDate && subscription.expiryDate > now
          ? subscription.expiryDate
          : now;

      let metadata: Record<string, unknown>;

      if (action === "extend") {
        const { days } = body;
        if (typeof days !== "number" || days <= 0) {
          return withCORS(NextResponse.json({ error: "Invalid number of days" }, { status: 400 }));
        }
        subscription.expiryDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
        metadata = { days };
        // Goodwill/paid-context extension — not a comp grant.
        subscription.source = "paid";
        subscription.compGrantedBy = undefined;
        subscription.compGrantedAt = undefined;
      } else {
        const { unit } = body;
        if (unit !== "month" && unit !== "year") {
          return withCORS(
            NextResponse.json({ error: "unit must be 'month' or 'year'" }, { status: 400 })
          );
        }
        // Calendar-based, not a fixed day count, so "1 month" from Jan 31
        // lands on a sane date instead of always being exactly 30 days.
        const newExpiry = new Date(base);
        if (unit === "month") newExpiry.setMonth(newExpiry.getMonth() + 1);
        else newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        subscription.expiryDate = newExpiry;
        metadata = { unit };
        subscription.source = "comped";
        subscription.compGrantedBy = session.user.id as any;
        subscription.compGrantedAt = now;
      }

      subscription.status = "active";
      subscription.startDate = subscription.startDate || now;
      subscription.cancelledAt = undefined;
      subscription.cancelledBy = undefined;
      subscription.cancellationReason = undefined;
      await subscription.save();

      await AuditLog.create({
        action:
          action === "extend" ? "VENDOR_SUBSCRIPTION_EXTENDED" : "VENDOR_SUBSCRIPTION_GRANTED_FREE",
        performedBy: session.user.id,
        targetEntity: "VendorSubscription",
        targetId: subscription._id,
        shopId,
        before,
        after: subscription.toObject(),
        metadata,
      });

      return withCORS(NextResponse.json({ success: true, subscription }));
    }

    return withCORS(NextResponse.json({ error: "Unknown action" }, { status: 400 }));
  } catch (error) {
    console.error("Error updating vendor subscription:", error);
    return withCORS(NextResponse.json({ error: "Failed to update subscription" }, { status: 500 }));
  }
}
