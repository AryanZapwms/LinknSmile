import mongoose from "mongoose"

const productSchema = new mongoose.Schema(
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
    price: {
      type: Number,
      required: true,
    },
    discountPrice: Number,
    image: String,
    images: [String],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
      // ✅ ADD THESE NEW FIELDS
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: false, // Make it optional for migration (existing products won't have it)
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // ✅ IMPORTANT: Default to "approved" for existing products
    },
    rejectionReason: {
      type: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    stock: {
      type: Number,
      default: 0,
    },
    sku: String,
    ingredients: [String],
    benefits: [String],
    usage: String,
    suitableFor: [String],
    results: [
      {
        image: String,
        title: String,
        text: String,
      },
    ],
    // New: Size variants with individual pricing and stock
    sizes: [
      {
        size: String, // e.g., "50ml", "100ml", "1L"
        unit: {
          type: String,
          enum: ["ml", "l", "g", "kg"],
          default: "ml",
        },
        quantity: Number, // e.g., 50, 100, 1000
        price: Number, // Individual price for this size
        discountPrice: Number, // Individual discount price
        stock: {
          type: Number,
          default: 0,
        },
        sku: String, // Optional SKU for this specific size
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { isActive: 1, company: 1, category: 1 },
      { createdAt: -1 },
      { slug: 1 },
      { company: 1 }, 
      { category: 1 },
      { isActive: 1, createdAt: -1 },
      { shopId: 1, approvalStatus: 1 },
      { approvalStatus: 1 },
    ]
  },
)

// For Next.js development, delete the model if it exists to ensure new schema is used
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.Product;
}

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema)
