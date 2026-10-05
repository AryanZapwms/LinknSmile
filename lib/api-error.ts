// lib/api-error.ts
//
// Machine-readable errors for mobile-facing routes: `{ error, code }`.
// `error` stays a human-readable message (existing web callers read it);
// `code` is what the mobile app switches on. Codes are listed in
// lib/contracts/errors.ts.

import { NextResponse } from "next/server";
import { withCORS } from "@/lib/cors";
import type { ErrorCode } from "@/lib/contracts/errors";

export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
  headers?: Record<string, string>
) {
  return withCORS(NextResponse.json({ error: message, code, ...extra }, { status, headers }));
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
