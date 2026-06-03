/**
 * app/robots.ts
 *
 * Generates robots.txt dynamically via Next.js metadata API.
 * Disallows crawlers from admin, auth, checkout, and profile routes.
 */

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://linkn-smile.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/auth/",
          "/checkout/",
          "/profile/",
          "/order-success/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
