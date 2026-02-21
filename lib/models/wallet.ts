import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWallet extends Document {
  shopId: mongoose.Types.ObjectId; // Owner (Vendor)
  type: 'VENDOR' | 'RESERVE' | 'PLATFORM_REVENUE' | 'SYSTEM_ASSET';
  currency: string;
  pendingBalance: number; // Sum of PENDING ledger entries (cached)
  withdrawableBalance: number; // Sum of CLEARED ledger entries (cached)
  frozenBalance: number; // Disputes / Holds
  minimumThreshold: number;
  lastReconciledAt: Date;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  version: number; // For optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    type: { 
      type: String, 
      enum: ['VENDOR', 'RESERVE', 'PLATFORM_REVENUE', 'SYSTEM_ASSET'],
      default: 'VENDOR' 
    },
    currency: { type: String, default: 'INR' },
    pendingBalance: { type: Number, default: 0 },
    withdrawableBalance: { type: Number, default: 0 },
    frozenBalance: { type: Number, default: 0 },
    minimumThreshold: { type: Number, default: 500 }, // Minimal withdrawable amount
    lastReconciledAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['ACTIVE', 'FROZEN', 'CLOSED'],
      default: 'ACTIVE' 
    },
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ensure one wallet per shop per type
WalletSchema.index({ shopId: 1, type: 1 }, { unique: true });

export const Wallet: Model<IWallet> =
  mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);
