import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayout extends Document {
  shopId: mongoose.Types.ObjectId;
  amount: number;
  idempotencyKey: string;            // SHA256(shopId + amount + requestedAt) — prevents duplicates
  status: 'REQUESTED' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  bankAccountNumber?: string;        // masked, from shop settings at time of request
  bankIfsc?: string;
  bankName?: string;
  orderIds: mongoose.Types.ObjectId[];
  notes?: string;
  failureReason?: string;
  transactionId?: string;            // bank/gateway reference
  isExitSettlement: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  processedAt?: Date;
  ledgerEntryId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    amount: { type: Number, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'REQUESTED',
    },
    bankAccountNumber: { type: String },
    bankIfsc: { type: String },
    bankName: { type: String },
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    notes: { type: String },
    failureReason: { type: String },
    transactionId: { type: String },
    isExitSettlement: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    processedAt: { type: Date },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
  },
  { timestamps: true }
);

PayoutSchema.index({ shopId: 1, status: 1 });
PayoutSchema.index({ idempotencyKey: 1 }, { unique: true });

const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>('Payout', PayoutSchema);
export default Payout;