// lib/contracts/registration.ts — sign-up, email OTP and password reset (/api/auth/*)
//
// These are older routes. Their errors have no `code`: register sends
// `{ error }` (a zod issue array when validation fails), register-vendor
// sends `{ message }`, the rest send `{ error }`. Switch on the HTTP status.
// 429 responses carry a Retry-After header where the limit is time-based.
//
// Each request schema states what its route requires, no more: the website
// and the app may be stricter in their forms (phone and PIN formats, etc.).
import { z } from "zod";
import { authUser } from "./auth";

/** Shortest password accepted by register, reset-password and change-password. */
export const MIN_PASSWORD_LENGTH = 6;

/** Codes are 6 digits, sent by email, valid for 10 minutes. */
const otpCode = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");
const required = z.string().min(1);

export const messageResponse = z.object({ message: z.string() });

// POST /api/auth/register — customer sign-up. Emails a code; the account is
// created by /api/auth/verify-otp. `role` may be omitted; any other value is
// rejected (sellers use /api/auth/register-vendor). Returns 201.
export const registerRequest = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(MIN_PASSWORD_LENGTH, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.literal("user").default("user"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type RegisterRequest = z.input<typeof registerRequest>;
export const registerResponse = z.object({ message: z.string(), email: z.string() });

// POST /api/auth/register-vendor — seller sign-up. Emails a code; the account
// and its shop (awaiting approval) are created by /api/auth/verify-otp.
// Returns 201.
export const registerVendorRequest = z.object({
  name: required,
  email: required,
  password: required,
  shopName: required,
  street: required,
  city: required,
  state: required,
  pincode: required,
  /** Becomes the shop's contact number. */
  phone: z.string().optional(),
  description: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
});
export type RegisterVendorRequest = z.infer<typeof registerVendorRequest>;
export const registerVendorResponse = z.object({ success: z.literal(true), message: z.string(), email: z.string() });

// POST /api/auth/verify-otp — completes either sign-up. 400 for a wrong or
// expired code, 429 after 5 wrong attempts. `role` is absent only in the
// "already verified" answer.
export const verifyOtpRequest = z.object({ email: required, otp: otpCode });
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequest>;
export const verifyOtpResponse = z.object({ message: z.string(), role: authUser.shape.role.optional() });

// POST /api/auth/resend-otp — a new sign-up code. 429 within 30 seconds of the
// previous one, and after 10 in a day; 404 without a pending sign-up.
export const resendOtpRequest = z.object({ email: required });
export type ResendOtpRequest = z.infer<typeof resendOtpRequest>;

// POST /api/auth/forgot-password — emails a reset code. Answers 200 with the
// same message whether or not the email has an account. 3 per 15 minutes.
export const forgotPasswordRequest = z.object({ email: required });
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequest>;

// POST /api/auth/verify-reset-otp — checks a reset code without using it up.
// 400 for a wrong or expired code; the code is discarded after 5 wrong tries.
export const verifyResetOtpRequest = z.object({ email: required, otp: otpCode });
export type VerifyResetOtpRequest = z.infer<typeof verifyResetOtpRequest>;

// POST /api/auth/reset-password — sets the new password and uses up the code.
export const resetPasswordRequest = z.object({
  email: required,
  otp: otpCode,
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, "Password must be at least 6 characters"),
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequest>;
