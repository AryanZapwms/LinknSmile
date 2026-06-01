import mongoose from "mongoose"

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    image: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    stock: { type: Number, required: true },
    shopId: { type: String, required: true },
    shopName: { type: String, required: true },
    commissionRate: { type: Number, required: true },
    selectedSize: {
      size: { type: String },
      unit: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      discountPrice: { type: Number },
      stock: { type: Number },
    },
  },
  { _id: true }
)

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    items: [cartItemSchema],
    totalPrice: { type: Number, default: 0 },
    version: { type: Number, default: 0 }, // For optimistic locking
  },
  { timestamps: true }
)

// Pre-save hook to calculate total price
cartSchema.pre("save", function (next) {
  this.totalPrice = this.items.reduce((total, item) => {
    const price = item.selectedSize?.price || item.price
    const finalPrice = item.selectedSize?.discountPrice || item.discountPrice || price
    return total + finalPrice * item.quantity
  }, 0)
  next()
})

export const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema)
