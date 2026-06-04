import mongoose, { Schema, Document } from "mongoose";

export interface IFavourite extends Document {
  userId: string;
  type: "product" | "seller"; // seller = company
  refId: string; // product._id or company._id
  createdAt: Date;
}

const FavouriteSchema = new Schema<IFavourite>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["product", "seller"], required: true },
    refId: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent duplicates
FavouriteSchema.index({ userId: 1, type: 1, refId: 1 }, { unique: true });

export default mongoose.models.Favourite ||
  mongoose.model<IFavourite>("Favourite", FavouriteSchema);
