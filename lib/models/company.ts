import mongoose from "mongoose";

// Subdocument schema for carousel images
const carouselImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String },
    description: { type: String },
  },
  { _id: true }
);

// Subdocument schema for new arrivals products
const newArrivalSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String },
    position: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// Subdocument schema for shop by concern items
const shopByConcernSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { _id: true }
);

// Settings schema for new arrivals
const newArrivalsSettingsSchema = new mongoose.Schema(
  {
    isVisible: { type: Boolean, default: true },
    limit: { type: Number, default: 10 },
  },
  { _id: false }
);

// Settings schema for shop by concern
const shopByConcernSettingsSchema = new mongoose.Schema(
  {
    isVisible: { type: Boolean, default: true },
    limit: { type: Number, default: 6 },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: String,
    logo: String,
    banner: String,
    email: String,
    phone: String,
    website: String,
    position: {
      type: Number,
      default: 0,
    },
    carouselImages: [carouselImageSchema],
    newArrivals: [newArrivalSchema],
    newArrivalsSettings: {
      type: newArrivalsSettingsSchema,
      default: { isVisible: true, limit: 10 },
    },
    shopByConcern: [shopByConcernSchema],
    shopByConcernSettings: {
      type: shopByConcernSettingsSchema,
      default: { isVisible: true, limit: 6 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      // Index for slug lookups (already unique, but add compound)
      { slug: 1, isActive: 1 },
      // Index for active companies sorted by position
      { isActive: 1, position: 1 },
      // Index for name searches
      { name: 1 },
    ]
  }
);

// For Next.js development, delete the model if it exists to ensure new schema is used
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.Company;
}

export const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);
