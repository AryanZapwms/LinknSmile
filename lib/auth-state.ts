// lib/auth-state.ts
//
// The one DB read that decides whether a signed-in user may keep their
// session: used by the NextAuth jwt callback (web, lib/auth-options.ts)
// and by mobile refresh-token rotation (lib/mobile-tokens.ts), so a
// deactivated account or a role change is picked up the same way on both.

import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

export interface AuthState {
  isActive?: boolean;
  role?: string;
  shopId?: unknown;
  email?: string;
  name?: string;
}

/** Returns null when the user no longer exists. Throws if the DB is unreachable. */
export async function readAuthState(userId: string): Promise<AuthState | null> {
  await connectDB();
  return User.findById(userId).select("isActive role shopId email name").lean<AuthState>();
}

/** Deleted or deactivated users lose every session. */
export function isAuthStateRevoked(state: AuthState | null): boolean {
  return !state || state.isActive === false;
}
