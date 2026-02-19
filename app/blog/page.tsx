"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Blog {
  _id: string
  title: string
  slug: string
  excerpt: string
  image: string
  author: { name: string }
  company: { name: string; slug: string }
  tags: string[]
  createdAt: string
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs")
      if (!res.ok) throw new Error("Failed to fetch blogs")
      const data = await res.json()
      setBlogs(data)
      setFilteredBlogs(data)

      // Extract all unique tags
      const tags = new Set<string>()
      data.forEach((blog: Blog) => {
        blog.tags?.forEach((tag) => tags.add(tag))
      })
      setAllTags(Array.from(tags))
    } catch (error) {
      console.error("Error fetching blogs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = blogs

    if (searchTerm) {
      filtered = filtered.filter(
        (blog) =>
          blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          blog.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedTag) {
      filtered = filtered.filter((blog) => blog.tags?.includes(selectedTag))
    }

    setFilteredBlogs(filtered)
  }, [searchTerm, selectedTag, blogs])

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
        <div className="mb-12">
          {/* <h1 className="text-4xl font-bold text-foreground mb-4">Instapeels Blog</h1> */}
          <p className="text-lg text-muted-foreground">
            Expert tips, product reviews, and skincare advice from our specialists
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search blogs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(null)}
                className={selectedTag === null ? "" : "bg-transparent"}
              >
                All
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className={selectedTag === tag ? "" : "bg-transparent"}
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Blog Grid */}
        {filteredBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <Link key={blog._id} href={`/blog/${blog.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {blog.image ? (
                      <Image
                        src={blog.image || "/companylogo.jpg"}
                        alt={blog.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  <CardHeader>
                    <h3 className="font-semibold text-foreground line-clamp-2 hover:text-primary">{blog.title}</h3>
                    <p className="text-xs text-muted-foreground mt-2">{blog.company.name || "Intapeels"}</p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{blog.excerpt}</p>

                    {blog.tags && blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {blog.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                      <span>{blog.author?.name}</span>
                      <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No blogs found matching your criteria.</p>
          </div>
        )}
      </div>
    </main>
  )
}
