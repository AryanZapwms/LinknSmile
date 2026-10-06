import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Defined in lib/contracts so the mobile app validates sign-up with the very
// schema POST /api/auth/register applies.
export { registerRequest as registerSchema } from "@/lib/contracts/registration";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string(),
  price: z.number().positive("Price must be positive"),
  discountPrice: z.number().optional(),
  stock: z.number().int().nonnegative(),
  category: z.string(),
  company: z.string(),
});
