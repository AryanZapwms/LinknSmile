import { connectDB } from "@/lib/db";
import { Blog } from "@/lib/models/blog";
import { Product } from "@/lib/models/product";
import { shownProductFilter } from "@/lib/storefront-visibility";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic"; // 👈 prevents static export error

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://linkn-smile.vercel.app";

  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

  const blogs = await Blog.find({ isPublished: true }).select("slug updatedAt").lean();
  const blogRoutes = blogs.map((blog) => ({
    url: `${baseUrl}/blog/${blog.slug}`,
    lastModified: blog.updatedAt || new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Only products a visitor can open: switched on, approved and not hidden
  // for an expired subscription. Anything else would send search engines to
  // a "not found" page.
  const products = await Product.find(shownProductFilter()).select("_id updatedAt").lean();

  const productRoutes = products.map((product: any) => ({
    url: `${baseUrl}/products/${product._id}`,
    lastModified: product.updatedAt || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes, ...productRoutes];
}
