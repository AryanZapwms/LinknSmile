// lib/services-admin-http.ts
//
// What every /api/admin/services route does around lib/services-admin.ts:
// admin check, JSON body, and turning a refusal into a response.
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { withCORS } from "@/lib/cors";
import { apiError, clientIp } from "@/lib/api-error";
import type { AdminActor, ServicesFailure } from "@/lib/services-admin";

/** The admin making the request, or the 401 to return. */
export async function servicesAdmin(
  req: NextRequest
): Promise<{ ok: true; admin: AdminActor } | { ok: false; response: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return { ok: false, response: withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 })) };
  }
  await connectDB();
  return { ok: true, admin: { id: session.user.id, ip: clientIp(req) } };
}

/** The JSON body as an object, or null when it is not one. */
export async function jsonBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}

export const badBody = () =>
  apiError("VALIDATION_ERROR", "Expected a JSON body", 400, { message: "Expected a JSON body" });

export const servicesFailure = ({ code, message, status, reason, field, invalidIds }: ServicesFailure) =>
  apiError(code, message, status, { message, reason, field, invalidIds });

export const servicesError = (what: string, error: unknown) => {
  console.error(`Admin services: ${what} failed:`, error);
  return apiError("INTERNAL_ERROR", `Failed to ${what}`, 500, { message: `Failed to ${what}` });
};
