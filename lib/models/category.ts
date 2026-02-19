import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    description: String,
    image: String,
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strictPopulate: false,
    indexes: [
      // Index for slug lookups
      { slug: 1 },
      // Index for company-based category queries
      { company: 1, isActive: 1 },
      // Index for parent-child relationships
      { parent: 1, company: 1 },
      // Compound index for active categories by company
      { company: 1, isActive: 1, parent: 1 },
    ]
  }
);

delete mongoose.models.Category;
export const Category = mongoose.model("Category", categorySchema);
