import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { CURRENT_MOU_VERSION } from "@/lib/mou-content";
import {
  MOU_REMINDER_COOLDOWN_MS,
  getMouReminderStats,
  nextMouReminderAt,
  vendorMouStages,
  type VendorMouDoc,
} from "@/lib/vendor-mou-tracking";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_PAGE = 100_000;
const MAX_SEARCH_LENGTH = 100;

function intParam(value: string | null, fallback: number, max: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Facets {
  summary: { total: number; accepted: number }[];
  matched: { n: number }[];
  vendors: VendorMouDoc[];
}

// GET /api/admin/vendors/mou?page=&limit=&status=all|accepted|pending&search=
//
// Which active vendors have accepted the current MOU version. `summary`
// always covers every vendor; `status` and `search` (shop name, owner name
// or email) only narrow `vendors` and `pagination`.
export async function GET(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    const { searchParams } = new URL(request.url);
    const page = intParam(searchParams.get("page"), 1, MAX_PAGE);
    const limit = intParam(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
    const status = searchParams.get("status");
    const search = (searchParams.get("search") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);

    const filter: Record<string, unknown> = {};
    if (status === "accepted") filter.accepted = true;
    if (status === "pending") filter.accepted = false;
    if (search) {
      const contains = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ shopName: contains }, { "owner.name": contains }, { "owner.email": contains }];
    }

    await connectDB();

    const [facets] = await Shop.aggregate<Facets>([
      ...vendorMouStages(),
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                accepted: { $sum: { $cond: ["$accepted", 1, 0] } },
              },
            },
          ],
          matched: [{ $match: filter }, { $count: "n" }],
          vendors: [
            { $match: filter },
            // Pending first, then newest shops.
            { $sort: { accepted: 1, createdAt: -1, _id: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
        },
      },
    ]);

    const summary = facets.summary[0] ?? { total: 0, accepted: 0 };
    const total = facets.matched[0]?.n ?? 0;
    const stats = await getMouReminderStats(facets.vendors.map((v) => v._id));
    const now = Date.now();

    const vendors = facets.vendors.map((vendor) => {
      const reminders = stats.get(String(vendor._id));
      const nextReminderAt = nextMouReminderAt(reminders?.lastRemindedAt, now);
      return {
        shopId: vendor._id,
        shopName: vendor.shopName,
        isApproved: !!vendor.isApproved,
        owner: { name: vendor.owner.name ?? null, email: vendor.owner.email ?? null },
        accepted: vendor.accepted,
        acceptedAt: vendor.acceptedAt,
        reminderCount: reminders?.count ?? 0,
        lastRemindedAt: reminders?.lastRemindedAt ?? null,
        nextReminderAt,
        canRemind: !vendor.accepted && !!vendor.owner.email && !nextReminderAt,
      };
    });

    return withCORS(
      NextResponse.json({
        success: true,
        mouVersion: CURRENT_MOU_VERSION,
        cooldownHours: MOU_REMINDER_COOLDOWN_MS / (60 * 60 * 1000),
        summary: {
          total: summary.total,
          accepted: summary.accepted,
          pending: summary.total - summary.accepted,
        },
        vendors,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      })
    );
  } catch (error: any) {
    console.error("Admin fetch vendor MOU status error:", error);
    return withCORS(
      NextResponse.json(
        { message: "Failed to fetch vendor MOU status", error: error.message },
        { status: 500 }
      )
    );
  }
}
