import { connectDB } from "@/lib/db";
import { Blog } from "@/lib/models/blog";
import { Product } from "@/lib/models/product";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic"; // 👈 prevents static export error

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  const baseUrl = "https://instapeels.com/";

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

  const blogs = await Blog.find({ isPublished: true })
    .select("slug updatedAt")
    .lean();
  const blogRoutes = blogs.map((blog) => ({
    url: `${baseUrl}/blog/${blog.slug}`,
    lastModified: blog.updatedAt || new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const products = await Product.find({ isActive: true })
    .select("_id updatedAt company")
    .populate("company", "slug")
    .lean();

  const productRoutes = products
    .filter((p: any) => p.company?.slug) // 👈 avoid null company errors
    .map((product: any) => ({
      url: `${baseUrl}/shop/${product.company.slug}/product/${product._id}`,
      lastModified: product.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticRoutes, ...blogRoutes, ...productRoutes];
}
