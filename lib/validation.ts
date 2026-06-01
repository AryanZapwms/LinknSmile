import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.literal("user").default("user"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string(),
  price: z.number().positive("Price must be positive"),
  discountPrice: z.number().optional(),
  stock: z.number().int().nonnegative(),
  category: z.string(),
  company: z.string(),
})
