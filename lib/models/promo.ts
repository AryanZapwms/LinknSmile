import mongoose from "mongoose";

const promoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      // required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: "",
    },
    linkText: {
      type: String,
      default: "",
    },
    backgroundColor: {
      type: String,
      default: "#000000",
    },
    textColor: {
      type: String,
      default: "#ffffff",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

delete mongoose.models.Promo;
export const Promo = mongoose.model("Promo", promoSchema);
