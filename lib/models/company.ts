import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
    isActive: {
      type: Boolean,
      default: true,
    },
    // For platform/landing page content
    carouselImages: [
      {
        url: String,
        title: String,
        link: String,
      },
    ],
    newArrivals: [
      {
        image: String,
        title: String,
        link: String,
      },
    ],
    shopByConcern: [
      {
        image: String,
        title: String,
        link: String,
      },
    ],
  },
  { timestamps: true }
);

export const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);
