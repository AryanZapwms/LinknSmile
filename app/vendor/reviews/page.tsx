"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Star, MessageSquare, Package, User, Clock, CheckCircle2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

interface Review {
  id: string
  rating: number
  comment: string
  userName: string
  userEmail: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  isVerifiedBuyer: boolean
  createdAt: string
  product: {
    id: string
    name: string
    image: string
    slug: string
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

export default function VendorReviewsPage() {
  const { toast } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/vendor/reviews")
      const data = await res.json()
      if (data.success) {
        setReviews(data.reviews)
        setSummary(data.summary)
        
        const initialReplies: Record<string, string> = {}
        data.reviews.forEach((r: Review) => {
          initialReplies[r.id] = r.reply?.message || ""
        })
        setReplyMessages(initialReplies)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load reviews",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
      toast({
        title: "Error",
        description: "Something went wrong while loading reviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
        title: "Error",
        description: "Please enter a reply message",
        variant: "destructive",
      })
      return
    }

    setReplySubmitting(reviewId)
    try {
      const res = await fetch(`/api/vendor/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      const data = await res.json()
      if (data.success) {
        toast({
          title: "Success",
          description: "Your reply has been posted",
        })
        
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: data.review.reply } : r))
      } else {
        throw new Error(data.error || "Failed to post reply")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setReplySubmitting(null)
    }
  }

  const ratingPercentage = (rating: number) => {
    if (!summary || summary.total === 0) return 0
    return Math.round(((summary.ratingCounts as any)[rating] / summary.total) * 100)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Reviews</h1>
        <p className="text-muted-foreground">Manage and respond to feedback from your customers.</p>
      </div>

      {summary && summary.total > 0 ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold">{summary.averageRating}</span>
                <div className="flex flex-col">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3 w-3 ${summary.averageRating >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{summary.total} reviews</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-4">
                    <span className="text-xs font-medium w-4">{rating}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full" 
                        style={{ width: `${ratingPercentage(rating)}%` }} 
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{ratingPercentage(rating)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="flex flex-col items-center gap-2">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-medium">No reviews yet</h3>
              <p className="text-sm text-muted-foreground">Customer reviews will appear here once they start rating your products.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">You haven't received any reviews yet.</p>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[240px_1fr]">
                    <div className="bg-muted/30 p-4 border-r space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Product</Label>
                        <div className="flex items-start gap-2">
                          <div className="h-8 w-8 rounded overflow-hidden bg-white shrink-0 border">
                            {review.product?.image ? (
                              <img src={review.product.image} alt={review.product.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-full w-full p-2 text-muted-foreground" />
                            )}
                          </div>
                          <Link href={`/vendor/products/${review.product?.id}`} className="text-xs font-medium hover:underline line-clamp-2">
                            {review.product?.name}
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Customer</Label>
                        <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium">{review.userName}</span>
                        </div>
                        {review.isVerifiedBuyer && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 text-[10px] h-5 px-1.5">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Verified Buyer
                            </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Date</Label>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-4 w-4 ${review.rating >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                            ))}
                          </div>
                          <Badge variant="secondary" className={`text-[10px] font-bold uppercase ${
                                review.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                                review.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                            {review.status}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{review.comment}</p>
                      </div>

                      {review.reply ? (
                        <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-purple-700">Your Response</span>
                            <span className="text-[10px] text-purple-600">{new Date(review.reply.repliedAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-purple-900">{review.reply.message}</p>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2 border-t">
                          <Textarea 
                            placeholder="Write a response to this customer..."
                            className="text-xs min-h-[60px] resize-none"
                            value={replyMessages[review.id] || ""}
                            onChange={(e) => handleReplyChange(review.id, e.target.value)}
                          />
                          <div className="flex justify-end">
                            <Button 
                              size="sm" 
                              className="h-7 text-[10px]"
                              disabled={replySubmitting === review.id || !replyMessages[review.id]?.trim()}
                              onClick={() => handleReplySubmit(review.id)}
                            >
                              Post Response
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
