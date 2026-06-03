/**
 * lib/rate-limit.ts
 *
 * Simple in-memory rate limiter using a sliding window.
 * Works on Vercel serverless (per-instance) — good enough for most use cases.
 * For multi-region or high-traffic apps, swap the store for Upstash Redis.
 *
 * Usage in an API route:
 *
 *   import { rateLimit } from "@/lib/rate-limit";
 *
 *   export async function POST(req: Request) {
 *     const ip = req.headers.get("x-forwarded-for") ?? "unknown";
 *     const { success, remaining } = rateLimit("send-otp", ip, { limit: 5, windowMs: 60_000 });
 *
 *     if (!success) {
 *       return Response.json(
 *         { error: "Too many requests. Please wait before trying again." },
 *         { status: 429, headers: { "Retry-After": "60" } }
 *       );
 *     }
 *     // ... rest of handler
 *   }
 */

interface RateLimitOptions {
  /** Max number of requests allowed within the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// In-memory store: Map<`${namespace}:${key}`, { count, resetAt }>
const store = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes to avoid memory leaks
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
      if (value.resetAt < now) store.delete(key);
    }
  },
  5 * 60 * 1000
);

export function rateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // First request in this window
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { success: true, remaining: options.limit - 1, resetAt: now + options.windowMs };
  }

  if (entry.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: options.limit - entry.count, resetAt: entry.resetAt };
}

// Pre-configured limiters for common routes — import these directly
export const otpLimiter = (ip: string) => rateLimit("otp", ip, { limit: 5, windowMs: 60_000 }); // 5 OTPs per minute

export const loginLimiter = (ip: string) => rateLimit("login", ip, { limit: 10, windowMs: 60_000 }); // 10 attempts per minute

export const paymentLimiter = (ip: string) =>
  rateLimit("payment", ip, { limit: 5, windowMs: 60_000 }); // 5 payment attempts per minute
