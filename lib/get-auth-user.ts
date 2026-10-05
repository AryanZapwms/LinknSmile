// lib/get-auth-user.ts
//
// One way for API routes to find out who is calling, for both clients:
// - Web: the NextAuth session cookie (getServerSession). The legacy mobile
//   app, which sends its /api/mobile-auth/login token as that cookie, also
//   lands here until it is retired.
// - Mobile: `Authorization: Bearer <access token>` from
//   /api/mobile-auth/{login,refresh} (lib/mobile-tokens.ts).
//
// When an Authorization: Bearer header is present it decides the result
// on its own: an invalid or expired token is a 401 (the app refreshes),
// never a silent fall-through to a cookie.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { verifyAccessToken } from "@/lib/mobile-tokens";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  shopId: string | null;
  via: "session" | "bearer";
}

export function bearerToken(req: Request | undefined): string | null {
  const header = req?.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

export async function getAuthUser(req?: Request): Promise<AuthUser | null> {
  const token = bearerToken(req);
  if (token) {
    const user = verifyAccessToken(token);
    return user ? { ...user, via: "bearer" } : null;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
    shopId: session.user.shopId ?? null,
    via: "session",
  };
}

/**
 * Drop-in for `getServerSession(authOptions)` in existing routes: same
 * `{ user: { id, email, name, role, shopId } }` shape, but also accepts
 * a mobile Bearer token.
 */
export async function getAuthSession(req?: Request): Promise<{ user: AuthUser } | null> {
  const user = await getAuthUser(req);
  return user ? { user } : null;
}
