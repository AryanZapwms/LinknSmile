/**
 * lib/env.ts
 *
 * Validates all required environment variables at startup.
 * Import this at the top of lib/db.ts (or any server-only module that runs early).
 *
 * Usage:
 *   import "@/lib/env";
 *
 * The process will throw immediately with a clear message if anything is missing,
 * instead of failing silently mid-request with a cryptic error.
 */

const requiredEnvVars = [
  "MONGODB_URI",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "GMAIL_EMAIL",
  "GMAIL_APP_PASSWORD",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
] as const;

function validateEnv() {
  // Only run on the server
  if (typeof window !== "undefined") return;

  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `\n\n❌ Missing required environment variables:\n\n` +
        missing.map((k) => `   • ${k}`).join("\n") +
        `\n\nCopy .env.example to .env.local and fill in the missing values.\n`
    );
  }
}

validateEnv();

// Export typed env for convenience — use this instead of process.env directly
export const env = {
  MONGODB_URI: process.env.MONGODB_URI!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
  GMAIL_EMAIL: process.env.GMAIL_EMAIL!,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD!,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID!,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET!,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  // Optional
  EMAIL_FROM: process.env.EMAIL_FROM ?? process.env.GMAIL_EMAIL!,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
} as const;
