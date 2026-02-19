// app\admin\blogs\add\page.tsx

"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ImageUploadField } from "@/components/admin/image-upload-field"
import { ArrowLeft } from "lucide-react"

interface Company {
  _id: string
  name: string
}

export default function AddBlogPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    image: "",
    tags: "",
    isPublished: false,
    company: "", // will hold companyId
  })

  useEffect(() => {
    // fetch companies for the dropdown
    fetchCompanies()
  }, [])

  if (!session) {
    return null
  }

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies")
      if (!res.ok) throw new Error("Failed to fetch companies")
      const data = await res.json()
      setCompanies(data)
    } catch (error) {
      console.error("Error fetching companies:", error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggle = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPublished: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error("Failed to create blog: " + text)
      }

      router.push("/admin/blogs")
    } catch (error) {
      console.error("Error creating blog:", error)
      alert("Failed to create blog")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/admin/blogs" className="inline-flex items-center gap-2 text-primary hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Add New Blog</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input name="title" value={formData.title} onChange={handleChange} placeholder="Blog title" required />
              </div>

              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input name="slug" value={formData.slug} onChange={handleChange} placeholder="blog-slug" required />
              </div>

              <div>
                <label className="text-sm font-medium">Company</label>
                <select
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="block w-full rounded-md border px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Excerpt</label>
                <Textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleChange}
                  placeholder="Short description"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Blog content"
                  rows={10}
                  required
                />
              </div>

              <div>
                <ImageUploadField
                  label="Image"
                  value={formData.image}
                  onChange={(image) => setFormData((prev) => ({ ...prev, image }))}
                  folder="blogs"
                  required={false}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="skincare, tips, tutorial"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={formData.isPublished} onCheckedChange={handleToggle} />
                <label className="text-sm font-medium">Publish immediately</label>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Blog"}
                </Button>
                <Link href="/admin/blogs">
                  <Button variant="outline" className="bg-transparent">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
