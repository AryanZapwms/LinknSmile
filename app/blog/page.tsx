// app/blog/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import { Blog } from "@/lib/models/blog";
import { LOCALE } from "@/lib/currency";
import { Calendar, User as UserIcon, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | Linknsmile",
  description: "Skincare tips, product guides, and stories from Linknsmile and our sellers.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

interface BlogListItem {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image?: string;
  author?: { name: string };
  company?: { name: string };
  createdAt: string;
}

async function getBlogs(page: number) {
  await connectDB();
  const query = { isPublished: true };
  const [blogs, total] = await Promise.all([
    Blog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate("author", "name")
      .populate("company", "name")
      .select("title slug excerpt image author company createdAt")
      .lean(),
    Blog.countDocuments(query),
  ]);
  return { blogs: blogs as unknown as BlogListItem[], total };
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const { blogs, total } = await getBlogs(page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
          <p className="mb-1.5 text-xs font-semibold tracking-widest text-amber-600 uppercase">
            Linknsmile
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">Blog</h1>
          <p className="mt-1 text-sm text-stone-400">
            {total} article{total !== 1 ? "s" : ""} on skincare, sellers, and more
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {blogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white py-24">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
              <BookOpen className="h-7 w-7 text-stone-300" />
            </div>
            <h3 className="mb-1 text-base font-bold text-stone-700">No articles yet</h3>
            <p className="max-w-xs text-center text-sm text-stone-400">
              Check back soon for skincare tips and stories.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <Link
                  key={blog._id}
                  href={`/blog/${blog.slug}`}
                  className="group overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-video w-full overflow-hidden bg-stone-100">
                    {blog.image ? (
                      <Image
                        src={blog.image}
                        alt={blog.title}
                        width={480}
                        height={270}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BookOpen className="h-8 w-8 text-stone-300" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    {blog.company?.name && (
                      <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        {blog.company.name}
                      </span>
                    )}
                    <h2 className="line-clamp-2 font-bold text-stone-900 group-hover:text-amber-700">
                      {blog.title}
                    </h2>
                    {blog.excerpt && (
                      <p className="line-clamp-2 text-sm text-stone-500">{blog.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 pt-1 text-xs text-stone-400">
                      {blog.author?.name && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" /> {blog.author.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(blog.createdAt).toLocaleDateString(LOCALE, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Link
                  href={page > 1 ? `/blog?page=${page - 1}` : "#"}
                  aria-disabled={page <= 1}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    page <= 1
                      ? "pointer-events-none border-stone-100 text-stone-300"
                      : "border-stone-200 text-stone-600 hover:border-amber-300 hover:text-amber-700"
                  }`}
                >
                  Previous
                </Link>
                <span className="text-sm text-stone-500">
                  Page {page} of {totalPages}
                </span>
                <Link
                  href={page < totalPages ? `/blog?page=${page + 1}` : "#"}
                  aria-disabled={page >= totalPages}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    page >= totalPages
                      ? "pointer-events-none border-stone-100 text-stone-300"
                      : "border-stone-200 text-stone-600 hover:border-amber-300 hover:text-amber-700"
                  }`}
                >
                  Next
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
