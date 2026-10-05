// lib/mobile-tokens.ts
//
// Bearer auth for the mobile app, independent of NextAuth internals:
// - Access token: HS256 JWT, 15 minutes, stateless. Carries the same user
//   fields a NextAuth session does (id, email, name, role, shopId) so
//   routes read it through lib/get-auth-user.ts exactly like a session.
// - Refresh token: 32 random bytes, 30 days (never past 90 days from the
//   original login, however often it is rotated), stored hashed
//   (lib/models/refresh-token.ts), rotated on every use, revocable. Every
//   refresh re-reads isActive/role/shopId via readAuthState() — the same
//   check the web jwt callback uses.
//
// The signing key is derived from NEXTAUTH_SECRET with HKDF under its own
// label, and tokens must carry this issuer/audience/typ, so a token signed
// with the raw secret (e.g. by the legacy /api/auth/login) never verifies here.

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { RefreshToken, type RefreshRevokeReason } from "@/lib/models/refresh-token";
import { readAuthState, isAuthStateRevoked, type AuthState } from "@/lib/auth-state";

export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Absolute cap from the original login: rotation can't extend a login past this.
export const REFRESH_FAMILY_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
// A second refresh with the same token this soon after it was rotated is
// treated as a client race (two requests refreshing at once), not theft:
// it is refused without revoking the family.
const ROTATION_RACE_LEEWAY_MS = 10_000;

const ISSUER = "linknsmile";
const AUDIENCE = "linknsmile-mobile";

export interface TokenUser {
  id: string;
  email: string;
  name: string;
  role: string;
  shopId: string | null;
}

interface AccessClaims {
  sub: string;
  email: string;
  name: string;
  role: string;
  shopId: string | null;
  sid: string; // refresh-token family, for logs/debugging
  typ: "access";
}

let cachedKey: { secret: string; key: Buffer } | undefined;
function signingKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  if (cachedKey?.secret !== secret) {
    const key = Buffer.from(
      crypto.hkdfSync("sha256", secret, "linknsmile-mobile-auth", "access-token-v1", 32)
    );
    cachedKey = { secret, key };
  }
  return cachedKey.key;
}

const hashToken = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

export function signAccessToken(user: TokenUser, familyId: string): { token: string; expiresAt: Date } {
  const claims: AccessClaims = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    shopId: user.shopId,
    sid: familyId,
    typ: "access",
  };
  const token = jwt.sign(claims, signingKey(), {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return { token, expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000) };
}

/** Returns the user the token was issued to, or null if it is invalid or expired. */
export function verifyAccessToken(token: string): TokenUser | null {
  try {
    const c = jwt.verify(token, signingKey(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as Partial<AccessClaims>;
    if (c.typ !== "access" || !c.sub || !c.role) return null;
    return {
      id: c.sub,
      email: c.email ?? "",
      name: c.name ?? "",
      role: c.role,
      shopId: c.shopId ?? null,
    };
  } catch {
    return null;
  }
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
}

interface DeviceMeta {
  userAgent?: string | null;
  deviceName?: string | null;
}

async function createRefreshToken(userId: string, familyId: string, familyIssuedAt: Date, meta: DeviceMeta) {
  const raw = `rt_${crypto.randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(
    Math.min(Date.now() + REFRESH_TOKEN_TTL_MS, familyIssuedAt.getTime() + REFRESH_FAMILY_MAX_AGE_MS)
  );
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(raw),
    familyId,
    familyIssuedAt,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 300) || undefined,
    deviceName: meta.deviceName?.slice(0, 100) || undefined,
  });
  return { raw, expiresAt };
}

function pair(user: TokenUser, familyId: string, refresh: { raw: string; expiresAt: Date }): TokenPair {
  const access = signAccessToken(user, familyId);
  return {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken: refresh.raw,
    refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
    tokenType: "Bearer",
  };
}

/** Starts a new token family (a login). */
export async function issueTokenPair(user: TokenUser, meta: DeviceMeta = {}): Promise<TokenPair> {
  await connectDB();
  const familyId = crypto.randomUUID();
  const refresh = await createRefreshToken(user.id, familyId, new Date(), meta);
  return pair(user, familyId, refresh);
}

export type RefreshResult =
  | { kind: "ok"; tokens: TokenPair; user: TokenUser }
  | { kind: "invalid" } // unknown, expired, or revoked for another reason
  | { kind: "rotated_race" } // just rotated by a concurrent request
  | { kind: "reuse_detected" } // rotated earlier and presented again: family revoked
  | { kind: "revoked" }; // user deleted or deactivated: family revoked

function toTokenUser(userId: string, state: AuthState): TokenUser {
  return {
    id: userId,
    email: state.email ?? "",
    name: state.name || "User",
    role: state.role || "user",
    shopId: state.shopId ? String(state.shopId) : null,
  };
}

async function revokeFamily(familyId: string, reason: RefreshRevokeReason) {
  await RefreshToken.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
}

/**
 * Exchanges a refresh token for a new pair. The presented token is revoked
 * atomically, so of two concurrent calls with the same token exactly one
 * succeeds. Throws only if the DB is unreachable.
 */
export async function rotateRefreshToken(raw: string, meta: DeviceMeta = {}): Promise<RefreshResult> {
  if (typeof raw !== "string" || !raw.startsWith("rt_") || raw.length > 200) return { kind: "invalid" };
  await connectDB();
  const now = new Date();
  const tokenHash = hashToken(raw);

  const current = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, revokedReason: "rotated", lastUsedAt: now } },
    { new: false }
  ).lean<{ userId: unknown; familyId: string; familyIssuedAt: Date }>();

  if (!current) {
    const seen = await RefreshToken.findOne({ tokenHash })
      .select("familyId revokedAt revokedReason userId")
      .lean<{ familyId: string; revokedAt?: Date; revokedReason?: string; userId: unknown }>();
    if (seen?.revokedReason === "rotated" && seen.revokedAt) {
      if (now.getTime() - new Date(seen.revokedAt).getTime() < ROTATION_RACE_LEEWAY_MS) {
        return { kind: "rotated_race" };
      }
      await revokeFamily(seen.familyId, "reuse_detected");
      console.warn("[mobile-auth] REFRESH_TOKEN_REUSE — family revoked", {
        userId: String(seen.userId),
        familyId: seen.familyId,
      });
      return { kind: "reuse_detected" };
    }
    return { kind: "invalid" };
  }

  const userId = String(current.userId);
  const familyIssuedAt = new Date(current.familyIssuedAt);
  // expiresAt is already capped, so this only catches clock/edge cases —
  // but it is the rule, so check it explicitly.
  if (now.getTime() >= familyIssuedAt.getTime() + REFRESH_FAMILY_MAX_AGE_MS) {
    await revokeFamily(current.familyId, "max_age");
    await RefreshToken.updateOne({ tokenHash }, { $set: { revokedReason: "max_age" } });
    return { kind: "invalid" };
  }

  const state = await readAuthState(userId);
  if (isAuthStateRevoked(state)) {
    await revokeFamily(current.familyId, "user_inactive");
    // The claim above labelled this token "rotated"; relabel it so a retry
    // is plain invalid, not mistaken for a race or a reuse.
    await RefreshToken.updateOne({ tokenHash }, { $set: { revokedReason: "user_inactive" } });
    return { kind: "revoked" };
  }

  const user = toTokenUser(userId, state!);
  const refresh = await createRefreshToken(userId, current.familyId, familyIssuedAt, meta);
  return { kind: "ok", tokens: pair(user, current.familyId, refresh), user };
}

/**
 * Logout: revokes the family the token belongs to. Idempotent; unknown
 * tokens are ignored. Returns the owner's id when the token was known.
 */
export async function revokeRefreshToken(raw: string): Promise<string | null> {
  if (typeof raw !== "string" || !raw.startsWith("rt_") || raw.length > 200) return null;
  await connectDB();
  const doc = await RefreshToken.findOne({ tokenHash: hashToken(raw) })
    .select("familyId userId")
    .lean<{ familyId: string; userId: unknown }>();
  if (!doc) return null;
  await revokeFamily(doc.familyId, "logout");
  return String(doc.userId);
}

/** Revokes every refresh token of a user (logout everywhere, account deletion). */
export async function revokeAllRefreshTokens(userId: string, reason: RefreshRevokeReason) {
  await connectDB();
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
}
