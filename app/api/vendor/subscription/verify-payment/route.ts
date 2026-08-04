import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { VendorSubscription } from "@/lib/models/vendor-subscription";
import Shop from "@/lib/models/shop";
import { Product } from "@/lib/models/product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  sendEmail,
  getVendorSubscriptionPaymentEmail,
  getAdminVendorSubscriptionPaidEmail,
} from "@/lib/email";
import { paymentLimiter } from "@/lib/rate-limit";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = paymentLimiter(ip);
  if (!success) {
    return Response.json(
      { error: "Too many requests. Please wait a minute before trying again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return withCORS(NextResponse.json({ error: "Missing payment details" }, { status: 400 }));
    }

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return withCORS(NextResponse.json({ error: "Invalid signature" }, { status: 400 }));
    }

    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const shopId = session.user.shopId;
    if (!shopId) {
      return withCORS(NextResponse.json({ error: "No shop found for this account." }, { status: 404 }));
    }

    const subscription = await VendorSubscription.findOne({ shopId });
    if (!subscription || subscription.razorpayOrderId !== razorpayOrderId) {
      return withCORS(NextResponse.json({ error: "No matching subscription order found" }, { status: 400 }));
    }

    // Idempotency: don't double-process the same payment
    const alreadyProcessed = subscription.paymentHistory.some(
      (p) => p.razorpayPaymentId === razorpayPaymentId
    );
    if (alreadyProcessed) {
      return withCORS(NextResponse.json({ success: true, subscriptionId: subscription._id }));
    }

    const now = new Date();
    const hasRemainingTime =
      subscription.status === "active" && subscription.expiryDate && subscription.expiryDate > now;

    const startDate = hasRemainingTime ? subscription.startDate! : now;
    const expiryBase = hasRemainingTime ? subscription.expiryDate!.getTime() : now.getTime();
    const expiryDate = new Date(expiryBase + ONE_YEAR_MS);

    subscription.status = "active";
    subscription.startDate = startDate;
    subscription.expiryDate = expiryDate;
    subscription.razorpayPaymentId = razorpayPaymentId;
    subscription.cancelledAt = undefined;
    subscription.cancelledBy = undefined;
    subscription.cancellationReason = undefined;
    subscription.paymentHistory.push({
      amount: subscription.amount,
      razorpayOrderId,
      razorpayPaymentId,
      paidAt: now,
      status: "success",
    });
    await subscription.save();

    // Renewal reactivates any storefront-hidden products immediately —
    // don't make the vendor wait for the next cron run.
    await Product.updateMany({ shopId, hiddenBySubscription: true }, { hiddenBySubscription: false });

    const shop = await Shop.findById(shopId).populate("ownerId", "name email").lean<any>();
    const ownerEmail = shop?.ownerId?.email;
    const ownerName = shop?.ownerId?.name || "Vendor";
    const shopName = shop?.shopName || "Your shop";

    try {
      if (ownerEmail) {
        await sendEmail({
          to: ownerEmail,
          subject: `Subscription Confirmed - ${shopName}`,
          html: getVendorSubscriptionPaymentEmail({
            vendorName: ownerName,
            shopName,
            amount: subscription.amount,
            expiryDate,
          }),
        });
      }
      await sendEmail({
        to: process.env.GMAIL_EMAIL || "instapeels@gmail.com",
        subject: `Vendor Subscription Paid - ${shopName}`,
        html: getAdminVendorSubscriptionPaidEmail({
          shopName,
          ownerName,
          ownerEmail: ownerEmail || "",
          amount: subscription.amount,
          expiryDate,
        }),
      });
    } catch (emailError) {
      console.error("Failed to send subscription emails:", emailError);
    }

    return withCORS(
      NextResponse.json({ success: true, subscriptionId: subscription._id, expiryDate })
    );
  } catch (error) {
    console.error("Vendor subscription verify-payment error:", error);
    return withCORS(
      NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
    );
  }
}
