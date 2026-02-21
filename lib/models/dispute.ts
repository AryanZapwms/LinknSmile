import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDisputeCase extends Document {
  shopId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  paymentReferenceId?: string; // razorpay payment ID
  amount: number;
  type: 'CHARGEBACK' | 'REFUND_DISPUTE' | 'FRAUD';
  status: 'OPEN' | 'EVIDENCE_SUBMITTED' | 'WON' | 'LOST' | 'CLOSED';
  frozenLedgerEntryId?: mongoose.Types.ObjectId;
  resolvedLedgerEntryId?: mongoose.Types.ObjectId;
  evidence?: string[];
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeCaseSchema = new Schema<IDisputeCase>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    paymentReferenceId: { type: String },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['CHARGEBACK', 'REFUND_DISPUTE', 'FRAUD'],
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'EVIDENCE_SUBMITTED', 'WON', 'LOST', 'CLOSED'],
      default: 'OPEN',
    },
    frozenLedgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
    resolvedLedgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
    evidence: [{ type: String }],
    resolutionNotes: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

DisputeCaseSchema.index({ shopId: 1, status: 1 });
DisputeCaseSchema.index({ orderId: 1 });

export const DisputeCase: Model<IDisputeCase> =
  mongoose.models.DisputeCase ||
  mongoose.model<IDisputeCase>('DisputeCase', DisputeCaseSchema);
