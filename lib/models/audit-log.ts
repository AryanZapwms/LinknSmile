import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  performedBy: mongoose.Types.ObjectId | string; // userId or 'SYSTEM'
  targetEntity: string; // 'Wallet', 'Payout', 'Shop', etc.
  targetId?: mongoose.Types.ObjectId | string;
  shopId?: mongoose.Types.ObjectId;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ipAddress?: string;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    performedBy: { type: Schema.Types.Mixed, required: true },
    targetEntity: { type: String, required: true },
    targetId: { type: Schema.Types.Mixed },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  {
    // No timestamps: true — we handle createdAt manually as immutable
    // No updatedAt — audit logs are write-once
    strict: true,
  }
);

// Block all mutations — audit logs are immutable
AuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('AuditLog entries are immutable. Create a new entry instead.');
});
AuditLogSchema.pre('updateOne', function () {
  throw new Error('AuditLog entries are immutable.');
});
AuditLogSchema.pre('updateMany', function () {
  throw new Error('AuditLog entries are immutable.');
});

AuditLogSchema.index({ shopId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
