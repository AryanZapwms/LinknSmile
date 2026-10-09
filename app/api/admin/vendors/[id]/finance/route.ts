// app/api/admin/vendors/[id]/finance/route.ts
//
// GET /api/admin/vendors/:id/finance — one vendor's wallet, ledger
// reconciliation, payouts, balance warnings, masked bank details and audit
// log, for the Finance tab on /admin/vendors/[id]. `:id` is the shop id.
//
// Read-only: there is no other method on this route, and the GET writes
// nothing (see lib/vendor-finance.ts). Admin only.
//
// Query: ledgerPage, ledgerLimit, auditPage, auditLimit (limits default to
// 20, at most 100).

import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getVendorFinance } from "@/lib/vendor-finance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    const { searchParams } = new URL(req.url);
    const finance = await getVendorFinance(id, {
      ledgerPage: Number(searchParams.get("ledgerPage")) || undefined,
      ledgerLimit: Number(searchParams.get("ledgerLimit")) || undefined,
      auditPage: Number(searchParams.get("auditPage")) || undefined,
      auditLimit: Number(searchParams.get("auditLimit")) || undefined,
    });

    if (!finance) {
      return withCORS(NextResponse.json({ message: "Shop not found" }, { status: 404 }));
    }

    return withCORS(NextResponse.json({ success: true, finance }));
  } catch (error) {
    // The message is not sent to the browser: a database error can name hosts.
    console.error("Vendor finance fetch error:", error);
    return withCORS(
      NextResponse.json({ message: "Failed to load vendor finance" }, { status: 500 })
    );
  }
}
