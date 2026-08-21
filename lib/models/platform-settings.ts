// lib/models/platform-settings.ts
//
// Admin-editable platform-level settings that previously required editing
// hardcoded literals in source (support email/phone) or didn't exist at all
// (tax-rate placeholder) — no .env/redeploy needed to change them anymore.
// Singleton pattern, same as PaymentSettings/VendorSubscriptionSettings.
//
// Deliberately does NOT include: CURRENCY_CODE/LOCALE/PAYMENT_GATEWAY/brand
// name (stay env-driven, tied to deployment identity), tracking IDs (already
// covered by lib/site-config.ts), payment gateway secrets, or any actual tax
// computation logic — taxRatePercent is a placeholder field only, not wired
// into lib/pricing.ts. See PROJECT_SOURCE_OF_TRUTH.md §4.x for full detail.
import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    supportEmail: {
      type: String,
      default: "support@linknsmile.com",
    },
    supportPhone: {
      type: String,
      default: "+91 8355991099",
    },
    brandTagline: {
      type: String,
      default: "Net & Work Builds Up Net-Worth",
    },
    // Placeholder for the future tax-engine work (MULTI_COUNTRY_REQUIREMENTS.md
    // item 2) — admin-editable so that work has a place to read from, but not
    // read by lib/pricing.ts or computeOrderPricing anywhere yet.
    taxRatePercent: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const PlatformSettings =
  mongoose.models.PlatformSettings || mongoose.model("PlatformSettings", platformSettingsSchema);
