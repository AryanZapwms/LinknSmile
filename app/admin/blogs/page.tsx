"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit2, View } from "lucide-react"

interface Blog {
  _id: string
  title: string
  slug: string
  excerpt: string
  author?: { name: string }
  company?: { name: string }
  isPublished: boolean
  createdAt: string
}

export default function AdminBlogsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }

    fetchBlogs()
  }, [session, router])

  const fetchBlogs = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/blogs?all=true")
      if (!res.ok) throw new Error("Failed to fetch blogs")
      const data = await res.json()
      setBlogs(data)
    } catch (error) {
      console.error("Error fetching blogs:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteBlog = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return

    try {
      const res = await fetch(`/api/blogs/${slug}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete blog")
      await fetchBlogs()
    } catch (error) {
      console.error("Error deleting blog:", error)
      alert("Failed to delete blog")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading blogs...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Blog Management</h1>
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
              <p className="text-muted-foreground text-center py-8">No blogs yet. Create your first blog post!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Title</th>
                      <th className="text-left py-3 px-4 font-semibold">Company</th>
                      <th className="text-left py-3 px-4 font-semibold">Author</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.map((blog) => (
                      <tr key={blog._id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{blog.title}</td>
                        <td className="py-3 px-4">{blog.company?.name || "—"}</td>
                        <td className="py-3 px-4">{blog.author?.name || "—"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              blog.isPublished ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {blog.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(blog.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Link href={`/admin/blogs/${blog.slug}/edit`}>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/blog/${blog.slug}` }>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                <View className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button size="sm" variant="destructive" onClick={() => deleteBlog(blog.slug)}>
                              <Trash2 className="w-4 h-4" />
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
  )
}
