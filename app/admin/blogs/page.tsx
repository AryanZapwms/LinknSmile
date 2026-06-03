"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, View } from "lucide-react";

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  author?: { name: string };
  company?: { name: string };
  isPublished: boolean;
  createdAt: string;
}

export default function AdminBlogsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push("/auth/login");
      return;
    }

    fetchBlogs();
  }, [session, router]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/blogs?all=true");
      if (!res.ok) throw new Error("Failed to fetch blogs");
      const data = await res.json();
      setBlogs(data);
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBlog = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;

    try {
      const res = await fetch(`/api/blogs/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete blog");
      await fetchBlogs();
    } catch (error) {
      console.error("Error deleting blog:", error);
      alert("Failed to delete blog");
    }
  };

  if (loading) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading blogs...</p>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-foreground text-3xl font-bold">Blog Management</h1>
          <Link href="/admin/blogs/add">
            <Button>Add Blog</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Blogs</CardTitle>
          </CardHeader>
          <CardContent>
            {blogs.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No blogs yet. Create your first blog post!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Company</th>
                      <th className="px-4 py-3 text-left font-semibold">Author</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.map((blog) => (
                      <tr key={blog._id} className="border-border hover:bg-muted/50 border-b">
                        <td className="px-4 py-3 font-medium">{blog.title}</td>
                        <td className="px-4 py-3">{blog.company?.name || "—"}</td>
                        <td className="px-4 py-3">{blog.author?.name || "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              blog.isPublished
                                ? "bg-green-100 text-green-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {blog.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs">
                          {new Date(blog.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link href={`/admin/blogs/${blog.slug}/edit`}>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/blog/${blog.slug}`}>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                <View className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteBlog(blog.slug)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
