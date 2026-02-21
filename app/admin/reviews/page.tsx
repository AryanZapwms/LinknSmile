"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Star, ArrowLeft } from "lucide-react"

interface CompanySummary {
  companyId: string
  name: string
  slug: string
  logo?: string
  totalReviews: number
  averageRating: number
}

interface AdminReview {
  id: string
  rating: number
  comment: string
  userName: string
  userEmail: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  isVerifiedBuyer: boolean
  createdAt: string
  product?: {
    id: string
    name: string
    image?: string
    slug?: string
  } | null
  reply: {
    message: string
    repliedAt: string
    repliedBy: string
    repliedByName: string
  } | null
}

interface ReviewSummary {
  total: number
  averageRating: number
  ratingCounts: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

const defaultSummary: ReviewSummary = {
  total: 0,
  averageRating: 0,
  ratingCounts: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
}

function parseSummary(summary: any): ReviewSummary {
  if (!summary) {
    return { ...defaultSummary, ratingCounts: { ...defaultSummary.ratingCounts } }
  }
  return {
    total: typeof summary.total === "number" ? summary.total : 0,
    averageRating: typeof summary.averageRating === "number" ? summary.averageRating : 0,
    ratingCounts: {
      1: summary.ratingCounts?.[1] ?? 0,
      2: summary.ratingCounts?.[2] ?? 0,
      3: summary.ratingCounts?.[3] ?? 0,
      4: summary.ratingCounts?.[4] ?? 0,
      5: summary.ratingCounts?.[5] ?? 0,
    },
  }
}

function parseReview(review: any): AdminReview {
  const resolveId = (value: any) => {
    if (typeof value === "string") return value
    if (value?._id) return value._id.toString()
    if (typeof value?.toString === "function") return value.toString()
    return ""
  }

  const product = review?.product
    ? {
      id: resolveId(review.product.id ?? review.product._id),
      name: typeof review.product.name === "string" ? review.product.name : "",
      image: typeof review.product.image === "string" ? review.product.image : undefined,
      slug: typeof review.product.slug === "string" ? review.product.slug : undefined,
    }
    : null

  const reply = review?.reply
    ? {
      message: typeof review.reply.message === "string" ? review.reply.message : "",
      repliedAt:
        typeof review.reply.repliedAt === "string"
          ? review.reply.repliedAt
          : review.reply.repliedAt instanceof Date
            ? review.reply.repliedAt.toISOString()
            : "",
      repliedBy: resolveId(review.reply.repliedBy),
      repliedByName: typeof review.reply.repliedByName === "string" ? review.reply.repliedByName : "",
    }
    : null

  return {
    id: resolveId(review?.id ?? review?._id),
    rating: Number(review?.rating) || 0,
    comment: typeof review?.comment === "string" ? review.comment : "",
    userName: typeof review?.userName === "string" ? review.userName : "",
    userEmail: typeof review?.userEmail === "string" ? review.userEmail : "",
    status: review?.status || 'PENDING',
    isVerifiedBuyer: !!review?.isVerifiedBuyer,
    createdAt:
      typeof review?.createdAt === "string"
        ? review.createdAt
        : review?.createdAt instanceof Date
          ? review.createdAt.toISOString()
          : "",
    product,
    reply: reply && reply.message ? reply : null,
  }
}

export default function AdminReviewsPage() {
  const { toast } = useToast()
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<CompanySummary | null>(null)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [summary, setSummary] = useState<ReviewSummary>(defaultSummary)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  const handleStatusUpdate = async (reviewId: string, status: 'APPROVED' | 'REJECTED') => {
    setStatusUpdating(reviewId)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) throw new Error("Failed to update status")

      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r))
      toast({ title: `Review ${status.toLowerCase()}`, description: `The review has been ${status.toLowerCase()}.` })
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to update review status.", variant: "destructive" })
    } finally {
      setStatusUpdating(null)
    }
  }

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true)
      try {
        const res = await fetch("/api/admin/reviews")
        if (!res.ok) {
          throw new Error("Failed to load companies")
        }
        const data = await res.json()
        const list: CompanySummary[] = Array.isArray(data.companies) ? data.companies : []
        setCompanies(list)
        if (list.length > 0) {
          setSelectedCompanyId(list[0].companyId)
          setSelectedCompany(list[0])
        }
      } catch (error) {
        console.error("Error fetching companies:", error)
        toast({
          title: "Failed to load companies",
          description: "Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoadingCompanies(false)
      }
    }

    fetchCompanies()
  }, [toast])

  useEffect(() => {
    if (!selectedCompanyId) {
      setReviews([])
      setSummary({ ...defaultSummary, ratingCounts: { ...defaultSummary.ratingCounts } })
      return
    }

    const company = companies.find((item) => item.companyId === selectedCompanyId) || null
    setSelectedCompany(company)

    const fetchReviews = async () => {
      setReviewsLoading(true)
      try {
        const res = await fetch(`/api/admin/reviews?companyId=${selectedCompanyId}`)
        if (!res.ok) {
          throw new Error("Failed to load reviews")
        }
        const data = await res.json()
        const parsed = Array.isArray(data.reviews) ? data.reviews.map(parseReview) : []
        setReviews(parsed)
        setSummary(parseSummary(data.summary))
        const replies: Record<string, string> = {}
        for (const review of parsed) {
          replies[review.id] = review.reply?.message || ""
        }
        setReplyMessages(replies)
      } catch (error) {
        console.error("Error fetching reviews:", error)
        toast({
          title: "Failed to load reviews",
          description: "Please try again later.",
          variant: "destructive",
        })
        setReviews([])
        setSummary({ ...defaultSummary, ratingCounts: { ...defaultSummary.ratingCounts } })
        setReplyMessages({})
      } finally {
        setReviewsLoading(false)
      }
    }

    fetchReviews()
  }, [companies, selectedCompanyId, toast])

  const handleCompanyClick = (companyId: string) => {
    if (companyId === selectedCompanyId) return
    setSelectedCompanyId(companyId)
  }

  const handleReplyChange = (reviewId: string, value: string) => {
    setReplyMessages((prev) => ({
      ...prev,
      [reviewId]: value,
    }))
  }

  const handleReplySubmit = async (reviewId: string) => {
    const message = replyMessages[reviewId]?.trim()
    if (!message) {
      toast({
        title: "Reply required",
        description: "Please enter a reply message.",
        variant: "destructive",
      })
      return
    }

    setReplySubmitting(reviewId)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to send reply" }))
        throw new Error(error.error || "Failed to send reply")
      }

      const data = await res.json()
      if (data.review) {
        const parsed = parseReview(data.review)
        setReviews((prev) => prev.map((item) => (item.id === reviewId ? parsed : item)))
        setReplyMessages((prev) => ({
          ...prev,
          [reviewId]: parsed.reply?.message || "",
        }))
        toast({
          title: "Reply sent",
          description: "Your response has been posted.",
        })
      }
    } catch (error) {
      console.error("Error replying to review:", error)
      toast({
        title: "Failed to send reply",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setReplySubmitting(null)
    }
  }

  const ratingPercentage = useMemo(() => {
    if (!summary.total) {
      return (rating: number) => 0
    }
    return (rating: number) => Math.round(((summary.ratingCounts as any)[rating] / summary.total) * 100)
  }, [summary])

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Reviews</h1>
            <p className="text-muted-foreground">Manage customer feedback and respond on behalf of each company.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Companies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingCompanies ? (
                  <p className="text-sm text-muted-foreground">Loading companies...</p>
                ) : companies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews available.</p>
                ) : (
                  companies.map((company) => (
                    <button
                      key={company.companyId}
                      onClick={() => handleCompanyClick(company.companyId)}
                      className={`w-full border rounded-lg p-4 text-left transition ${company.companyId === selectedCompanyId
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted">
                          {company.logo ? (
                            <Image src={company.logo} alt={company.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              {company.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.totalReviews} reviews</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-foreground">
                          <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
                          <span>{company.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{selectedCompany ? selectedCompany.name : "Select a company"}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCompany ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Total Reviews</p>
                      <p className="text-2xl font-semibold text-foreground">{summary.total}</p>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Average Rating</p>
                      <p className="text-2xl font-semibold text-foreground">{summary.averageRating.toFixed(1)}</p>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">5 Star Share</p>
                      <p className="text-2xl font-semibold text-foreground">{ratingPercentage(5)}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a company to view its reviews.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading reviews...</p>
                ) : reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews for this company yet.</p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-foreground">{review.userName || "Anonymous"}</p>
                            {review.isVerifiedBuyer && (
                              <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Verified Buyer</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              review.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                              review.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {review.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{review.userEmail}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(review.createdAt).toLocaleString()}</p>
                          {review.product && selectedCompany?.slug && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Product: {review.product.name}{" "}
                              <Link
                                href={`/shop/${selectedCompany.slug}/product/${review.product.id}`}
                                className="text-primary hover:underline"
                              >
                                (View Product Detail Page)
                              </Link>
                            </p>
                          )}

                        </div>
                        <div className="flex flex-col items-end gap-2">
                             <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <Star
                                    key={rating}
                                    className={`h-4 w-4 ${review.rating >= rating ? "fill-yellow-400 stroke-yellow-400" : "stroke-muted-foreground"}`}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
                                    onClick={() => handleStatusUpdate(review.id, 'APPROVED')}
                                    disabled={statusUpdating === review.id || review.status === 'APPROVED'}
                                >
                                    Approve
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                                    onClick={() => handleStatusUpdate(review.id, 'REJECTED')}
                                    disabled={statusUpdating === review.id || review.status === 'REJECTED'}
                                >
                                    Reject
                                </Button>
                            </div>
                        </div>
                      </div>

                      <p className="text-sm text-foreground">{review.comment}</p>

                      {review.reply && (
                        <div className="bg-muted/50 border border-border rounded-lg p-3">
                          <p className="text-sm font-semibold text-foreground">Intapeels replied</p>
                          <p className="text-sm text-muted-foreground mt-1">{review.reply.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(review.reply.repliedAt).toLocaleString()} — {review.reply.repliedByName}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Textarea
                          value={replyMessages[review.id] ?? ""}
                          onChange={(event) => handleReplyChange(review.id, event.target.value)}
                          placeholder="Write a reply as the company"
                          rows={3}
                          className="bg-background border-border"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleReplySubmit(review.id)}
                            disabled={replySubmitting === review.id}
                          >
                            {replySubmitting === review.id ? "Sending..." : "Send Reply"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
