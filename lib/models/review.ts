import mongoose from "mongoose"

const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    repliedAt: { type: Date, default: Date.now },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    repliedByName: { type: String, required: true },
  },
  { _id: false },
)

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    reply: replySchema,
  },
  { timestamps: true },
)

reviewSchema.index({ product: 1, user: 1 }, { unique: true })

export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema)
