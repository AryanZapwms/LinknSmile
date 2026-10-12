// lib/last-login.ts
//
// User.lastLoginAt: when a user last signed in. Written once per successful
// sign-in, from the two places a sign-in completes:
//   - the website: NextAuth's signIn event (lib/auth-options.ts), for both
//     password and Google sign-ins;
//   - the mobile app: POST /api/mobile-auth/login.
// It is NOT written when a session is refreshed or read (NextAuth's jwt and
// session callbacks, POST /api/mobile-auth/refresh, getAuthUser()).

import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

type Who = { id: string } | { email: string };

/**
 * Never throws: failing to note the time must not turn a successful sign-in
 * into a failed one. The failure is logged.
 */
export async function recordLastLogin(who: Who, at: Date = new Date()): Promise<void> {
  try {
    await connectDB();
    const filter = "id" in who ? { _id: who.id } : { email: who.email.trim().toLowerCase() };
    // timestamps: false: signing in is not a change to the account, so
    // updatedAt keeps meaning "the account's details last changed".
    await User.updateOne(filter, { $set: { lastLoginAt: at } }, { timestamps: false });
  } catch (error) {
    console.error("[auth] could not record lastLoginAt", error);
  }
}
