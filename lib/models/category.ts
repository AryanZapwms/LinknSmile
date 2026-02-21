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

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
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
      // Index for parent-child relationships
      { parent: 1 },
    ]
  }
);

delete mongoose.models.Category;
export const Category = mongoose.model("Category", categorySchema);
