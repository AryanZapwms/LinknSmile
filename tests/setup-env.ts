// Dummy values so lib/env.ts's startup validation passes in tests.
// None of these are real credentials, and nothing here reads .env files.
// MONGODB_URI is set per test file by tests/helpers/mongo.ts.
Object.assign(process.env, {
  NEXTAUTH_SECRET: "test-only-not-a-real-secret",
  NEXTAUTH_URL: "http://localhost:3000",
  GMAIL_EMAIL: "test@example.com",
  GMAIL_APP_PASSWORD: "test-only",
  PAYMENT_GATEWAY: "razorpay",
  RAZORPAY_KEY_ID: "rzp_test_dummy",
  RAZORPAY_KEY_SECRET: "test-only",
  NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_dummy",
  RAZORPAY_WEBHOOK_SECRET: "whsec_test_only",
  IMAGE_PROVIDER: "cloudinary",
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
});
