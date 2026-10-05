// lib/models/refresh-token.ts
//
// Mobile refresh tokens (see lib/mobile-tokens.ts). Only a SHA-256 hash of
// each token is stored — the raw value exists only on the device. Every
// refresh revokes the presented token ("rotated") and issues a new one in
// the same family; presenting a rotated token again revokes the whole
// family (reuse detection). A family is one login on one device.

import mongoose from "mongoose";

export const REFRESH_REVOKE_REASONS = [
  "rotated",
  "logout",
  "logout_all",
  "reuse_detected",
  "user_inactive",
  "account_deleted",
  "max_age", // the login is older than the absolute cap (lib/mobile-tokens.ts)
] as const;
export type RefreshRevokeReason = (typeof REFRESH_REVOKE_REASONS)[number];

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    // When the family's first token was issued (the login). Copied to every
    // rotated token; no token of the family is valid past it + the cap.
    familyIssuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedReason: { type: String, enum: REFRESH_REVOKE_REASONS },
    lastUsedAt: { type: Date },
    // Informational only (shown nowhere yet); trimmed at write time.
    userAgent: { type: String },
    deviceName: { type: String },
  },
  { timestamps: true }
);

// Expired tokens are useless (refresh rejects them), so MongoDB removes them.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken =
  mongoose.models.RefreshToken || mongoose.model("RefreshToken", refreshTokenSchema);
