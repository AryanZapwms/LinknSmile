// app/api/users/push-token/route.ts
// Registers (POST) or removes (DELETE) this device's Expo push token for
// the signed-in user. A token belongs to one device, so registering it
// takes it away from any other account that device was logged into —
// otherwise the previous user would keep receiving this device's pushes.
// Logout (/api/mobile-auth/logout) also removes it.

import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { getAuthUser, type AuthUser } from "@/lib/get-auth-user";
import { apiError } from "@/lib/api-error";
import { pushTokenRequest } from "@/lib/contracts/users";

// Newest tokens kept per user (one per device; old devices fall off).
const MAX_TOKENS_PER_USER = 10;

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

type Parsed =
  | { ok: true; user: AuthUser; token: string }
  | { ok: false; response: ReturnType<typeof apiError> };

async function parse(req: NextRequest): Promise<Parsed> {
  const user = await getAuthUser(req);
  if (!user) return { ok: false, response: apiError("UNAUTHORIZED", "Unauthorized", 401) };
  const parsed = pushTokenRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return { ok: false, response: apiError("VALIDATION_ERROR", "A valid Expo push token is required", 400) };
  }
  return { ok: true, user, token: parsed.data.token };
}

export async function POST(req: NextRequest) {
  const p = await parse(req);
  if (!p.ok) return p.response;
  try {
    await connectDB();
    await User.updateMany({ _id: { $ne: p.user.id }, pushTokens: p.token }, { $pull: { pushTokens: p.token } });
    // Move the token to the end (newest) and keep the last MAX_TOKENS_PER_USER.
    await User.updateOne({ _id: p.user.id }, { $pull: { pushTokens: p.token } });
    await User.updateOne(
      { _id: p.user.id },
      { $push: { pushTokens: { $each: [p.token], $slice: -MAX_TOKENS_PER_USER } } }
    );
    return withCORS(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("[push-token] register failed:", error);
    return apiError("INTERNAL_ERROR", "Could not register push token", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const p = await parse(req);
  if (!p.ok) return p.response;
  try {
    await connectDB();
    await User.updateOne({ _id: p.user.id }, { $pull: { pushTokens: p.token } });
    return withCORS(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("[push-token] remove failed:", error);
    return apiError("INTERNAL_ERROR", "Could not remove push token", 500);
  }
}
