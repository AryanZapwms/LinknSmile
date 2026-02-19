import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShop extends Document {
  ownerId: mongoose.Types.ObjectId;
  shopName: string;
  slug: string;
  description: string;
  logo?: string;
  coverImage?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  contactInfo: {
    phone: string;
    email: string;
  };
  businessProof?: string; // document URL
  gstNumber?: string;
  panNumber?: string;
  commissionRate: number; // platform commission %
  isApproved: boolean;
  isActive: boolean;
  approvalDate?: Date;
  rejectionReason?: string;
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
  };
  ratings: {
    average: number;
    count: number;
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    shopName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    logo: { type: String },
    coverImage: { type: String },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    contactInfo: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    businessProof: { type: String },
    gstNumber: { type: String },
    panNumber: { type: String },
    commissionRate: { type: Number, default: 10 }, // 10% default
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    approvalDate: { type: Date },
    rejectionReason: { type: String },
    bankDetails: {
      accountHolderName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
      upiId: { type: String },
    },
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    stats: {
      totalProducts: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// ShopSchema.index({ slug: 1 });
// ShopSchema.index({ ownerId: 1 });
ShopSchema.index({ isApproved: 1, isActive: 1 });

// For Next.js development, delete the model if it exists to ensure new schema is used
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.Shop;
}

const Shop: Model<IShop> = mongoose.models.Shop || mongoose.model<IShop>('Shop', ShopSchema);
export default Shop;