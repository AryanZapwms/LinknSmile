import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import Shop from "@/lib/models/shop";
import { VendorMouAcceptance } from "@/lib/models/vendor-mou-acceptance";
import { CURRENT_MOU_VERSION, getMouMarkdown } from "@/lib/mou-content";

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const [user, shop, acceptance] = await Promise.all([
      User.findById(session.user.id).select("name"),
      session.user.shopId ? Shop.findById(session.user.shopId).select("shopName") : null,
      VendorMouAcceptance.findOne({
        userId: session.user.id,
        mouVersion: CURRENT_MOU_VERSION,
      }),
    ]);

    if (!user) {
      return withCORS(NextResponse.json({ message: "User not found" }, { status: 404 }));
    }

    const content = getMouMarkdown({
      vendorName: user.name,
      vendorId: session.user.id,
      shopName: shop?.shopName,
      date: acceptance?.acceptedAt,
    });

    return withCORS(
      NextResponse.json({
        success: true,
        version: CURRENT_MOU_VERSION,
        content,
        accepted: !!acceptance,
        acceptedAt: acceptance?.acceptedAt ?? null,
      })
    );
  } catch (error: any) {
    return withCORS(
      NextResponse.json({ success: false, message: error.message }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "shop_owner") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    await connectDB();

    const existing = await VendorMouAcceptance.findOne({
      userId: session.user.id,
      mouVersion: CURRENT_MOU_VERSION,
    });

    if (existing) {
      return withCORS(
        NextResponse.json({ success: true, accepted: true, acceptedAt: existing.acceptedAt })
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    let acceptance;
    try {
      acceptance = await VendorMouAcceptance.create({
        userId: session.user.id,
        shopId: session.user.shopId || undefined,
        mouVersion: CURRENT_MOU_VERSION,
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
      });
    } catch (error: any) {
      // Concurrent double-submit racing past the findOne check above — the
      // unique (userId, mouVersion) index rejects the second insert, which
      // is fine, someone already recorded acceptance for this version.
      if (error?.code === 11000) {
        acceptance = await VendorMouAcceptance.findOne({
          userId: session.user.id,
          mouVersion: CURRENT_MOU_VERSION,
        });
      } else {
        throw error;
      }
    }

    return withCORS(
      NextResponse.json({
        success: true,
        accepted: true,
        acceptedAt: acceptance?.acceptedAt ?? new Date(),
      })
    );
  } catch (error: any) {
    return withCORS(
      NextResponse.json({ success: false, message: error.message }, { status: 500 })
    );
  }
}
