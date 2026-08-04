// app/api/health/route.ts
//
// Used by the deploy and rollback scripts (scripts/deploy/lib/health-check.sh)
// to confirm a release actually serves HTTP before it's ever put live.
// Deliberately does not touch the database — a transient Mongo blip
// shouldn't fail an otherwise-good deploy. This only proves the Next.js
// server process itself started and can respond.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
