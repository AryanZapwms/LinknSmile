// lib/models/service-category.ts
//
// One category of the /services page (Photography, Design, ...). Managed by
// an admin on /admin/services (lib/services-admin.ts); a shop with store
// type Services or Both picks one (Shop.serviceCategory). Names are given in
// English and optionally Arabic and Hindi (lib/service-category-rules.ts).
// The slug is made from the English name when the category is created and
// is kept on rename, so /services?category=<slug> links keep working.
import mongoose, { Schema, Document, Model } from "mongoose";
import { SERVICE_CATEGORY_NAME_MAX_LENGTH } from "@/lib/service-category-rules";

export interface IServiceCategory extends Document {
  name: { en: string; ar?: string; hi?: string };
  slug: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const nameField = (required: boolean) => ({
  type: String,
  trim: true,
  maxlength: SERVICE_CATEGORY_NAME_MAX_LENGTH,
  ...(required ? { required: true } : { default: "" }),
});

const ServiceCategorySchema = new Schema<IServiceCategory>(
  {
    name: {
      en: nameField(true),
      ar: nameField(false),
      hi: nameField(false),
    },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ServiceCategorySchema.index({ sortOrder: 1 });

export const ServiceCategory: Model<IServiceCategory> =
  mongoose.models.ServiceCategory ||
  mongoose.model<IServiceCategory>("ServiceCategory", ServiceCategorySchema);
