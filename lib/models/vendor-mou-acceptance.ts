// lib/models/vendor-mou-acceptance.ts
//
// One row per (userId, mouVersion) — never updated in place. When
// CURRENT_MOU_VERSION (lib/mou-content.ts) bumps, every vendor is asked to
// accept again and a new row is created, so this collection doubles as the
// full audit trail of every MOU revision a vendor has ever agreed to.
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVendorMouAcceptance extends Document {
  userId: mongoose.Types.ObjectId;
  shopId?: mongoose.Types.ObjectId;
  mouVersion: string;
  acceptedAt: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorMouAcceptanceSchema = new Schema<IVendorMouAcceptance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop" },
    mouVersion: { type: String, required: true },
    acceptedAt: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
  },
  { timestamps: true }
);

// A given vendor accepts a given MOU version exactly once; re-accepting the
// same version is a no-op rather than a new row (see the route handler).
VendorMouAcceptanceSchema.index({ userId: 1, mouVersion: 1 }, { unique: true });

export const VendorMouAcceptance: Model<IVendorMouAcceptance> =
  mongoose.models.VendorMouAcceptance ||
  mongoose.model<IVendorMouAcceptance>("VendorMouAcceptance", VendorMouAcceptanceSchema);
