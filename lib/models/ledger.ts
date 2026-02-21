import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILedgerEntry extends Document {
  transactionId: string; // Grouping ID for double-entry (e.g., UUID per business event)
  accountId: mongoose.Types.ObjectId; // Reference to Wallet
  shopId?: mongoose.Types.ObjectId; // Optional helper for faster querying
  amount: number; // Positive for Credit, Negative for Debit
  type: 'SALE' | 'PAYOUT' | 'REFUND' | 'COMMISSION' | 'ADJUSTMENT' | 'RESERVE';
  status: 'PENDING' | 'CLEARED' | 'VOIDED';
  description: string;
  referenceId?: string; // e.g. Order ID, Payout ID
  referenceType?: 'ORDER' | 'PAYOUT' | 'REFUND';
  clearAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    transactionId: { type: String, required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true },
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ['SALE', 'PAYOUT', 'REFUND', 'COMMISSION', 'ADJUSTMENT', 'RESERVE'],
      required: true 
    },
    status: { 
      type: String, 
      enum: ['PENDING', 'CLEARED', 'VOIDED'],
      default: 'PENDING',
      index: true
    },
    description: { type: String, required: true },
    referenceId: { type: String, index: true },
    referenceType: { type: String, enum: ['ORDER', 'PAYOUT', 'REFUND'] },
    clearAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound indexes for common queries
LedgerEntrySchema.index({ accountId: 1, status: 1, createdAt: -1 });
LedgerEntrySchema.index({ shopId: 1, type: 1, createdAt: -1 });

export const LedgerEntry: Model<ILedgerEntry> =
  mongoose.models.LedgerEntry || mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
