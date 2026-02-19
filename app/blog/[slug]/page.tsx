"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, ArrowLeft } from "lucide-react"

interface Blog {
  _id: string
  title: string
  slug: string
  content: string
  excerpt: string
  image: string
  author: { name: string; email: string }
  company: { name: string; slug: string }
  tags: string[]
  createdAt: string
}


export default function BlogDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [blog, setBlog] = useState<Blog | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await fetch(`/api/blogs/${slug}`)
        if (!res.ok) throw new Error("Failed to fetch blog")
        const data = await res.json()
        
        // Debug: log the image URL
        console.log("Blog image URL:", data.image)
        
        setBlog(data)
      } catch (error) {
        console.error("Error fetching blog:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlog()
  }, [slug])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog?.title,
        text: blog?.excerpt,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading blog...</p>
      </main>
    )
  }

  if (!blog) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Blog not found</p>
          <Link href="/blog">
            <Button>Back to Blogs</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-primary hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Link>

        <article>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">{blog.company.name}</span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {new Date(blog.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <h1 className="text-4xl font-bold text-foreground mb-4">{blog.title}</h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">By {blog.author?.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleShare} className="bg-transparent">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Featured Image */}
          {blog.image && !imageError ? (
            <div className="relative h-96 bg-muted rounded-lg overflow-hidden mb-8">
              <Image 
                src={blog.image} 
                alt={blog.title} 
                fill 
                className="object-cover"
                onError={() => {
                  console.error("Image failed to load:", blog.image)
                  setImageError(true)
                }}
                unoptimized
              />
            </div>
          ) : blog.image ? (
            <div className="relative h-96 bg-muted rounded-lg overflow-hidden mb-8 flex items-center justify-center">
              <p className="text-muted-foreground">Image failed to load</p>
              <p className="text-xs text-muted-foreground mt-2">{blog.image}</p>
            </div>
          ) : null}

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {blog.tags.map((tag) => (
                <Link key={tag} href={`/blog?tag=${tag}`}>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    {tag}
                  </Button>
                </Link>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-invert max-w-none mb-12">
            <div className="text-foreground leading-relaxed whitespace-pre-wrap">{blog.content}</div>
          </div>

          {/* Author Card */}
          <Card className="mt-12">
            <CardHeader>
              <CardTitle>About the Author</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{blog.author?.name}</p>
              <p className="text-sm text-muted-foreground mt-2">Expert contributor at {blog.company.name}</p>
            </CardContent>
          </Card>
        </article>
      </div>
    </main>
  )
}