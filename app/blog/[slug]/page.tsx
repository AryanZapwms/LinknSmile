// app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Blog } from "@/lib/models/blog";
import { LOCALE } from "@/lib/currency";
import { Calendar, User as UserIcon, ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

interface BlogDetail {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  image?: string;
  author?: { name: string };
  company?: { name: string; slug: string };
  createdAt: string;
}

async function getBlog(slug: string): Promise<BlogDetail | null> {
  await connectDB();
  const blog = await Blog.findOne({ slug, isPublished: true })
    .populate("author", "name")
    .populate("company", "name slug")
    .lean();
  return blog as unknown as BlogDetail | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog) return { title: "Blog post not found | Linknsmile" };

  const description = (blog.excerpt || blog.content).slice(0, 160);
  return {
    title: `${blog.title} | Linknsmile Blog`,
    description,
    openGraph: {
      title: blog.title,
      description,
      type: "article",
      images: blog.image ? [{ url: blog.image }] : undefined,
    },
    twitter: {
      card: blog.image ? "summary_large_image" : "summary",
      title: blog.title,
      description,
      images: blog.image ? [blog.image] : undefined,
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog) notFound();
  const t = await getTranslations("BlogDetailPage");

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t("backToBlog")}
        </Link>

        {blog.company?.name && (
          <span className="mb-3 inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            {blog.company.name}
          </span>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-4xl">
          {blog.title}
        </h1>

        <div className="mt-3 flex items-center gap-4 text-sm text-stone-400">
          {blog.author?.name && (
            <span className="flex items-center gap-1.5">
              <UserIcon className="h-4 w-4" /> {blog.author.name}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {new Date(blog.createdAt).toLocaleDateString(LOCALE, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {blog.image && (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl bg-stone-100">
            <Image src={blog.image} alt={blog.title} fill className="object-cover" priority />
          </div>
        )}

        <div className="mt-8 text-base leading-relaxed whitespace-pre-wrap text-stone-700">
          {blog.content}
        </div>
      </div>
    </div>
  );
}
