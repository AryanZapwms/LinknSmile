import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        price: Number,
        selectedSize: {
          size: String,
          unit: {
            type: String,
            enum: ["ml", "l", "g", "kg"],
          },
          quantity: Number,
          price: Number,
          discountPrice: Number,
        },
        shopId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Shop",
        },
        shopName: String,
        platformCommission: {
          type: Number,
          default: 0,
        },
        vendorEarnings: {
          type: Number,
          default: 0,
        },
        commissionRate: {
          type: Number,
          default: 10, // 10% default
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      zipCode: String,
      country: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "razorpay"],
      default: "razorpay",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,

    vendorPayouts: [
      {
        shopId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Shop",
        },
        amount: Number,
        status: {
          type: String,
          enum: ["pending", "released", "held"],
          default: "pending",
        },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ "items.shopId": 1 });
orderSchema.index({ "vendorPayouts.shopId": 1, "vendorPayouts.status": 1 });

export const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
