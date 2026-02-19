import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayout extends Document {
  shopId: mongoose.Types.ObjectId;
  amount: number;
  orderIds: mongoose.Types.ObjectId[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestDate: Date;
  processedDate?: Date;
  transactionId?: string;
  notes?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    amount: { type: Number, required: true },
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending' 
    },
    requestDate: { type: Date, default: Date.now },
    processedDate: { type: Date },
    transactionId: { type: String },
    notes: { type: String },
    failureReason: { type: String },
  },
  { timestamps: true }
);

PayoutSchema.index({ shopId: 1, status: 1 });

const Payout: Model<IPayout> = mongoose.models.Payout || mongoose.model<IPayout>('Payout', PayoutSchema);
export default Payout;