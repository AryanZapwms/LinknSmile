// app/shop/[company]/product/[id]/page.tsx
"use client"

import { FormEvent, useCallback, useEffect, useRef, useState, useMemo, memo } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Star, ChevronDown, X, Phone, ChevronLeft, ChevronRight } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCartStore } from "@/lib/store/cart-store"
import { ProductCard } from "@/components/product-card"
import FAQ from "@/components/FAQ"
import VerifiedImage from '../assets/verifiedtick.png'
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"
import { trackViewContent, trackAddToCart } from "@/lib/facebook-pixel"
import varifiedIcon from '../assets/verifiedtick.png'
import { useToast } from "@/hooks/use-toast"
/* =========================
   Cache configuration  
   ========================= */
const TTL = 1000 * 60 * 5 // 5 minutes: stale-after
const MAX_AGE = 1000 * 60 * 60 * 24 // 24 hours: eviction

function productCacheKey(productId: string) {
  return `product:${productId}`
}

function productReviewsCacheKey(productId: string) {
  return `product:reviews:${productId}`
}

function suggestedProductsCacheKey(companySlug: string, productId: string) {
  return `suggested:products:${companySlug}:${productId}`
}

/* =========================
   API Fetchers
   ========================= */

async function fetchProductAPI(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch product: ${res.status}`)
  const data = await res.json()
  if (!data || !data._id) throw new Error("Invalid product data")
  return data
}

async function fetchProductReviewsAPI(id: string): Promise<{ reviews: any[]; summary: any }> {
  try {
    const res = await fetch(`/api/products/${id}/reviews`, { cache: "no-store" })
    
    if (!res.ok) {
      // Try to get error details from response
      const errorData = await res.json().catch(() => ({}))
      const errorMessage = errorData.error || `Failed to fetch reviews: ${res.status} ${res.statusText}`
      throw new Error(errorMessage)
    }
    
    return res.json()
  } catch (error) {
    console.error("Error in fetchProductReviewsAPI:", error)
    throw error
  }
}
async function fetchSuggestedProductsAPI(companySlug: string, productId: string): Promise<SuggestedProduct[]> {
  const params = new URLSearchParams({
    company: companySlug,
    limit: "6",
    exclude: productId,
  })
  const res = await fetch(`/api/products?${params}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch suggested products")
  const data = await res.json()
  return data.products || []
}
interface Result {
  image: string
  title: string
  text: string
}

interface Size {
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
  sku?: string
}

interface Product {
  _id: string
  name: string
  description: string
  price: number
  discountPrice?: number
  image: string
  images: string[]
  stock: number
  ingredients: string[]
  benefits: string[]
  usage: string
  suitableFor?: string[]
  results?: Result[]
  company?: { name: string; slug: string }
  category?: { name: string }
  sizes?: Size[]
  mrp: string
   shopId?: {
    _id: string;
    shopName: string;
    commissionRate: number;
  } | string;
}

interface SuggestedProduct {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company: { name: string; slug: string }
}

type RatingKey = 1 | 2 | 3 | 4 | 5

interface ReviewSummary {
  total: number
  averageRating: number
  ratingCounts: Record<RatingKey, number>
}

interface ProductReview {
  id: string
  productId: string
  userId: string
  rating: number
  comment: string
  userName: string
  userEmail: string
  reply: {
    message: string
    repliedAt: string
    repliedBy: string
    repliedByName: string
  } | null
  createdAt: string
  updatedAt: string
}

const defaultReviewSummary: ReviewSummary = {
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

function parseReviewSummary(summary: any): ReviewSummary {
  if (!summary) {
    return { ...defaultReviewSummary, ratingCounts: { ...defaultReviewSummary.ratingCounts } }
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

function parseProductReview(review: any): ProductReview {
  const resolveId = (value: any) => {
    if (typeof value === "string") return value
    if (value?._id) return value._id.toString()
    if (typeof value?.toString === "function") return value.toString()
    return ""
  }

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
    productId: resolveId(review?.productId ?? review?.product),
    userId: resolveId(review?.userId ?? review?.user),
    rating: Number(review?.rating) || 0,
    comment: typeof review?.comment === "string" ? review.comment : "",
    userName: typeof review?.userName === "string" ? review.userName : "",
    userEmail: typeof review?.userEmail === "string" ? review.userEmail : "",
    reply: reply && reply.message ? reply : null,
    createdAt:
      typeof review?.createdAt === "string"
        ? review.createdAt
        : review?.createdAt instanceof Date
          ? review.createdAt.toISOString()
          : "",
    updatedAt:
      typeof review?.updatedAt === "string"
        ? review.updatedAt
        : review?.updatedAt instanceof Date
          ? review.updatedAt.toISOString()
          : "",
  }
}

const ProductDetailPage = memo(function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()
  const { toast } = useToast()
  const addItem = useCartStore((state) => state.addItem)
  const getTotalItems = useCartStore((state) => state.getTotalItems)

  // Instant render from cache (sync)
  const initialProduct = useMemo(() => getCachedSync<Product>(productCacheKey(id), MAX_AGE), [id])
  const initialReviews = useMemo(() => getCachedSync<{ reviews: any[]; summary: any }>(productReviewsCacheKey(id), MAX_AGE), [id])

  const [product, setProduct] = useState<Product | null>(initialProduct ?? null)
  const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([])
  const [loading, setLoading] = useState(!initialProduct)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<Size | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews ? (initialReviews.reviews || []).map(parseProductReview) : [])
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>(initialReviews ? parseReviewSummary(initialReviews.summary) : defaultReviewSummary)
  const [reviewsLoading, setReviewsLoading] = useState(!initialReviews)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [ratingInput, setRatingInput] = useState<RatingKey | 0>(0)
  const [hoverRating, setHoverRating] = useState<RatingKey | 0>(0)
  const [comment, setComment] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [activeTab, setActiveTab] = useState("ingredients")
  const [expanded, setExpanded] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const reviewsFetchRef = useRef(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)


  // Load product and suggested products
  useEffect(() => {
    let mounted = true

    async function loadProduct() {
      if (!id) return
      setLoading(true)
      try {
        const data = await fetchWithCache<Product>(
          productCacheKey(id),
          () => fetchProductAPI(id),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return

        setProduct(data)

        // Track ViewContent event for Facebook Pixel
        trackViewContent(data._id, data.name, data.discountPrice || data.price)

        // Fetch suggested products if company available
        if (data?.company?.slug) {
          loadSuggested(data.company.slug)
        }
      } catch (error) {
        console.error("Error fetching product:", error)
        if (!mounted) return
        setProduct(null)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    async function loadSuggested(companySlug: string) {
      try {
        const data = await fetchWithCache<SuggestedProduct[]>(
          suggestedProductsCacheKey(companySlug, id),
          () => fetchSuggestedProductsAPI(companySlug, id),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        setSuggestedProducts(data)
      } catch (error) {
        console.error("Error fetching suggested products:", error)
      }
    }

    loadProduct()
    return () => {
      mounted = false
    }
  }, [id])

  const loadReviews = useCallback(async () => {
    if (!id || reviewsFetchRef.current) return
    reviewsFetchRef.current = true
    setReviewsLoading(true)
    try {
      const data = await fetchWithCache<{ reviews: any[]; summary: any }>(
        productReviewsCacheKey(id),
        () => fetchProductReviewsAPI(id),
        { ttlMs: TTL * 2, maxAgeMs: MAX_AGE, backgroundRefresh: false, persistToStorage: true }
      )
      setReviews((data.reviews || []).map(parseProductReview))
      setReviewSummary(parseReviewSummary(data.summary))
    } catch (error) {
      console.error("Error fetching reviews:", error)
      setReviews([])
      setReviewSummary({ ...defaultReviewSummary, ratingCounts: { ...defaultReviewSummary.ratingCounts } })
    } finally {
      reviewsFetchRef.current = false
      setReviewsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setUserName(session.user.name)
      if (session.user.email) setUserEmail(session.user.email)
    }
  }, [session])

  useEffect(() => {
    if (!initialReviews) {
      loadReviews()
    }
  }, [initialReviews, loadReviews])

  // Auto-select first available size when product loads
  useEffect(() => {
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      const firstAvailableSize = product.sizes.find(size => size.stock > 0)
      if (firstAvailableSize) {
        setSelectedSize(firstAvailableSize)
      }
    }
  }, [product, selectedSize])

  const handleAddToCart = () => {
    if (!product) return

    // Check cart limit - max 5 products
    const totalItems = getTotalItems()
    if (totalItems >= 5) {
      setShowBulkOrderModal(true)
      return
    }

    // Check if product has sizes and require selection (fallback in case no sizes available)
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({
        title: "Size required",
        description: "Please select a size before adding to cart.",
        variant: "destructive",
      })
      return
    }

    // Check stock availability
    const stockToCheck = selectedSize ? selectedSize.stock : product.stock;
    if (stockToCheck === 0) {
      toast({
        title: "Out of stock",
        description: "This item is currently out of stock.",
        variant: "destructive",
      })
      return
    }

    addItem({
      productId: product._id,
      name: product.name,
      price: selectedSize ? selectedSize.price : product.price,
      discountPrice: selectedSize ? selectedSize.discountPrice : product.discountPrice,
      image: product.image,
      quantity,
      company: { _id: "dummy", name: product.company?.name || "", slug: product.company?.slug || "" },
      slug: product.company?.slug || "unknown",
      stock: selectedSize ? selectedSize.stock : product.stock,
      selectedSize: selectedSize || undefined,
      shopId: (typeof product.shopId === 'object' ? product.shopId?._id : product.shopId) || "default",
      shopName: (typeof product.shopId === 'object' ? product.shopId?.shopName : 'LinkAndSmile') || 'LinkAndSmile',
      commissionRate: (typeof product.shopId === 'object' ? product.shopId?.commissionRate : 10) || 10,
    })

    // Track AddToCart event for Facebook Pixel
    const itemPrice = selectedSize ? selectedSize.price : product.price
    const itemDiscountPrice = selectedSize ? selectedSize.discountPrice : product.discountPrice
    trackAddToCart(product._id, product.name, itemDiscountPrice || itemPrice, quantity)

    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name}${selectedSize ? ` (${selectedSize.size})` : ""} has been added to your cart.`,
    })

    setQuantity(1)
    setSelectedSize(null)
  }

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!id) return
    if (!session?.user?.id) {
      toast({
        title: "Login required",
        description: "Please sign in to submit a review.",
        variant: "destructive",
      })
      return
    }

    if (!ratingInput || ratingInput < 1 || ratingInput > 5) {
      toast({
        title: "Invalid rating",
        description: "Please select a star rating.",
        variant: "destructive",
      })
      return
    }

    if (!comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please enter your review text.",
        variant: "destructive",
      })
      return
    }

    if (!userName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide your name.",
        variant: "destructive",
      })
      return
    }

    if (!userEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please provide your email.",
        variant: "destructive",
      })
      return
    }

    setSubmittingReview(true)
    try {
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: ratingInput,
          comment,
          userName,
          userEmail,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to submit review" }))
        toast({
          title: "Review failed",
          description: error.error || "Could not submit review",
          variant: "destructive",
        })
        return
      }

      const data = await res.json()
      if (data.review) {
        setReviews((prev) => [parseProductReview(data.review), ...prev.filter((item) => item.userId !== (session?.user?.id || ""))])
      } else if (Array.isArray(data.reviews)) {
        setReviews(data.reviews.map(parseProductReview))
      }
      setReviewSummary(parseReviewSummary(data.summary))
      setRatingInput(0)
      setHoverRating(0)
      setComment("")

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      })
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Review failed",
        description: "Could not submit review.",
        variant: "destructive",
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  const ratingPercentage = useCallback(
    (rating: RatingKey) => {
      if (!reviewSummary.total) return 0
      return Math.round((reviewSummary.ratingCounts[rating] / reviewSummary.total) * 100)
    },
    [reviewSummary],
  )

  // Zoom effect setup - Amazon-style image zoom
  const zoomScale = 2;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate transform origin based on cursor position
    const originX = (x / rect.width) * 100;
    const originY = (y / rect.height) * 100;

    // Apply zoom transform
    const image = container.querySelector('img') as HTMLImageElement;
    if (image) {
      image.style.transformOrigin = `${originX}% ${originY}%`;
      image.style.transform = `scale(${zoomScale})`;
    }
  };

  const handleMouseEnter = () => {
    const container = containerRef.current;
    if (!container) return;

    const image = container.querySelector('img') as HTMLImageElement;
    if (image) {
      image.style.transition = 'transform 0.2s ease-out';
      image.style.transform = `scale(${zoomScale})`;
    }
  };

  const handleMouseLeave = () => {
    const container = containerRef.current;
    if (!container) return;

    const image = container.querySelector('img') as HTMLImageElement;
    if (image) {
      image.style.transition = 'transform 0.2s ease-out';
      image.style.transform = 'scale(1)';
    }
  };

  // Early returns AFTER all hooks are defined
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4">
              <div className="relative w-full aspect-square rounded-xl border bg-muted animate-pulse" />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-20 rounded-lg border bg-muted animate-pulse" />
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-10 w-full rounded bg-muted animate-pulse" />
              </div>

              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="h-4 w-full rounded bg-muted animate-pulse" />
                ))}
              </div>

              <div className="flex gap-3">
                <div className="h-11 w-32 rounded bg-muted animate-pulse" />
                <div className="h-11 w-32 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="h-6 w-40 rounded bg-muted animate-pulse" />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-36 rounded-xl border bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <p className="text-muted-foreground">Product not found</p>
      </main>
    )
  }

  // Calculate price and discount based on selected size or product default
  const currentPrice = selectedSize ? selectedSize.price : product.price
  const currentDiscountPrice = selectedSize ? selectedSize.discountPrice : product.discountPrice
  const discount = currentDiscountPrice
    ? Math.round(((currentPrice - currentDiscountPrice) / currentPrice) * 100)
    : 0
  const displayPrice = currentDiscountPrice || currentPrice
  // Check if product has sizes
  const hasSizes = product.sizes && product.sizes.length > 0;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">



        <div className="rounded-2xl border-2 border-gray-300 bg-[#FFFBF3] p-6 md:p-8 mb-8" style={{ boxShadow: "0 2px 0 rgba(0,0,0,0.06)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Images */}
            <div className="space-y-4">
              {/* Main image */}
              <div
                ref={containerRef}
                className="relative w-full aspect-square bg-[#F5F5F0] rounded-xl overflow-hidden border border-gray-200 cursor-zoom-in"
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={() => setShowImageModal(true)}
              >
                {product.images?.[selectedImage] ? (
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-200"
                    style={{ transformOrigin: 'center center' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                )}

                {/* Discount badge */}
                {discount > 0 && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold text-sm z-20">
                    {discount}% Off
                  </div>
                )}


                {/* View Full Screen Icon */}
                <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-lg backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>

              </div>

              {/* Horizontal thumbnails - All screen sizes */}
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                {product.images?.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all snap-start ${selectedImage === idx
                        ? "border-purple-500 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${idx}`}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full cursor-pointer"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-purple-600 mb-2 uppercase tracking-wide">{product.company?.name || "Unknown Brand"}</p>
                <h1 className="product-title text-3xl md:text-4xl text-gray-900 mb-2">{product.name}</h1>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg">
                    <Star className="h-5 w-5 fill-purple-400 stroke-purple-400" />
                    <span className="text-lg font-bold">{reviewSummary?.averageRating?.toFixed?.(1) ?? "0.0"}</span>
                    <span className="text-sm text-gray-600">({reviewSummary?.total ?? 0})</span>
                  </div>
                </div>
              </div>

              {/* Price area - Always show, uses selected size price when available */}
              <div className="space-y-2 pb-4 border-b border-gray-200">
                <div className="flex items-end gap-4">
                  <div>
                    <div className="text-4xl md:text-5xl font-extrabold text-gray-900">₹{displayPrice}</div>
                    {currentDiscountPrice && <div className="text-sm text-gray-400 line-through">₹{currentPrice}</div>}
                  </div>

                  <div className="ml-auto text-right">
                    <div className="text-sm text-red-700 font-semibold line-through">MRP ₹{selectedSize ? selectedSize.price : (product.mrp ?? product.price)}</div>
                    <div className="text-lg font-bold text-green-600">Discounted Price ₹{currentDiscountPrice ?? displayPrice}</div>
                    <div className="mt-2 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Incl. of all taxes</div>
                  </div>
                </div>
              </div>

              {/* Short description */}
              {product.description && (
                <div>
                  <p
                    className="text-gray-700 leading-relaxed"
                    style={
                      expanded
                        ? {}
                        : {
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }
                    }
                  >
                    {product.description}
                  </p>

                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-2 text-purple-600 font-semibold hover:underline cursor-pointer"
                  >
                    {expanded ? "Read less" : "Read more"}
                  </button>
                </div>
              )}

              {/* Size Selection - Only show if product has sizes */}
              {hasSizes && (
                <div className="space-y-3 pt-2 pb-4 border-b border-gray-200">
                  <label className="block text-sm font-semibold text-gray-900">Select Size</label>
                  <select
                    value={selectedSize ? `${selectedSize.size}-${selectedSize.quantity}` : ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setSelectedSize(null);
                        return;
                      }
                      const selected = product?.sizes?.find(
                        (s) => `${s.size}-${s.quantity}` === e.target.value
                      );
                      setSelectedSize(selected || null);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white font-medium text-gray-900 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                  >
                    <option value="">Choose a size...</option>
                    {product.sizes && product.sizes.map((size, idx) => (
                      <option
                        key={idx}
                        value={`${size.size}-${size.quantity}`}
                        disabled={size.stock === 0}
                      >
                        {size.size} ({size.quantity}{size.unit}) - ₹{size.discountPrice ? size.discountPrice.toLocaleString() : size.price.toLocaleString()}
                        {size.stock === 0 && " - Out of Stock"}
                      </option>
                    ))}
                  </select>

                  {/* Size-specific info */}
                  {selectedSize && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">
                          {selectedSize.stock < 3 ? "Out of stock" : "In stock"}
                        </span>
                      </p>
                      {selectedSize.discountPrice && selectedSize.stock >= 3 && (
                        <p className="text-sm text-green-600 font-medium mt-1">
                          You save ₹{(selectedSize.price - selectedSize.discountPrice).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Quantity + Add to Cart */}
              {/* Quantity + Add to Cart */}
              <div className="flex gap-4 pt-4 items-center">
                <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-5 py-3 text-gray-600 hover:bg-gray-50 font-semibold cursor-pointer"
                  >
                    −
                  </button>
                  <span className="px-6 py-3 font-bold text-gray-900 min-w-[48px] text-center border-x-2 border-gray-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-5 py-3 text-gray-600 hover:bg-gray-50 font-semibold cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* ✅ Out of Stock Logic (works for both simple & size-based products) */}
                {(
                  hasSizes
                    ? !selectedSize || selectedSize.stock <= 1
                    : product.stock <= 1
                ) ? (
                  <Button
                    className="flex-1 bg-gray-300 text-gray-700 font-semibold py-4 rounded-lg text-lg cursor-not-allowed"
                    disabled
                  >
                    Out of Stock
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-[#8B7355] hover:bg-[#756045] text-white font-semibold py-4 rounded-lg text-lg cursor-pointer"
                    onClick={handleAddToCart}
                  >
                    Add to Cart
                  </Button>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Results Section */}
        {product.results && product.results.length > 0 && (
          <div className="border border-[#A08C6A] rounded-2xl bg-[#FFFCF7] p-6 md:p-10 mb-10 mt-10">
            {/* Title */}
            <h2 className="text-center text-[#B08A2E] text-xl md:text-2xl font-semibold mb-6 md:mb-10 tracking-wide">
              Results of {product.name}
            </h2>

            {/* Cards wrapper
        - small/medium: horizontal scrolling flex container with snap
        - large (lg+): grid with 3 columns
    */}
            <div
              className="no-scrollbar flex gap-4 md:gap-6 lg:grid lg:grid-cols-3 lg:gap-8 py-2 px-4 -mx-4 lg:px-0 lg:mx-0 overflow-x-auto md:overflow-x-auto lg:overflow-visible snap-x snap-mandatory"
              aria-label="Results list"
              role="list"
              style={{ WebkitOverflowScrolling: "touch" }} // smooth touch scrolling on iOS
            >
              {product.results.map((result, idx) => (
                <div
                  key={idx}
                  role="listitem"
                  className="snap-start flex-shrink-0 min-w-[72%] sm:min-w-[48%] md:min-w-[40%] lg:min-w-0 bg-[#FFFDF9] rounded-2xl border border-[#E8D5C4] p-4 md:p-6 transition-all duration-300 hover:shadow-lg hover:border-[#A08C6A]"
                >
                  {/* Image */}
                  <div className="w-full h-44 md:h-56 relative mb-4 md:mb-5 overflow-hidden rounded-xl">
                    <Image src={result.image} alt={result.title} fill className="object-cover" />
                  </div>

                  {/* Subheading */}
                  <h3 className="text-[#C29A43] font-semibold text-lg mb-2 tracking-wide">
                    {result.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
                    {result.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Optional: small note for keyboard users */}
            <p className="sr-only">Scroll horizontally to see more results on small and medium screens.</p>


          </div>
        )}



        {/* Product Information Tabs */}
        <div className="border border-[#A08C6A] rounded-2xl bg-[#FFFCF7] overflow-hidden mb-10 mt-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tabs Header */}
            <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 bg-[#FFFCF7] p-4 rounded-none h-auto gap-4 justify-center">
              {product.ingredients && product.ingredients.length > 0 && (
                <TabsTrigger
                  value="ingredients"
                  className="cursor-pointer border border-[#A08C6A] bg-white data-[state=active]:bg-[#F6FCEE] data-[state=active]:text-[#3C8C3C] data-[state=active]:font-semibold data-[state=active]:border-[#3C8C3C] rounded-xl py-2.5 px-4 text-gray-700 text-sm md:text-base font-medium shadow-sm transition-all duration-300"
                >
                  Ingredients
                </TabsTrigger>
              )}
              {product.usage && (
                <TabsTrigger
                  value="usage"
                  className="cursor-pointer border border-[#A08C6A] bg-white data-[state=active]:bg-[#F6FCEE] data-[state=active]:text-[#3C8C3C] data-[state=active]:font-semibold data-[state=active]:border-[#3C8C3C] rounded-xl py-2.5 px-4 text-gray-700 text-sm md:text-base font-medium shadow-sm transition-all duration-300"
                >
                  How to Use
                </TabsTrigger>
              )}
              {product.suitableFor && product.suitableFor.length > 0 && (
                <TabsTrigger
                  value="suitable"
                  className="cursor-pointer border border-[#A08C6A] bg-white data-[state=active]:bg-[#F6FCEE] data-[state=active]:text-[#3C8C3C] data-[state=active]:font-semibold data-[state=active]:border-[#3C8C3C] rounded-xl py-2.5 px-4 text-gray-700 text-sm md:text-base font-medium shadow-sm transition-all duration-300"
                >
                  Suitable For
                </TabsTrigger>
              )}
              {product.benefits && product.benefits.length > 0 && (
                <TabsTrigger
                  value="benefits"
                  className="cursor-pointer border border-[#A08C6A] bg-white data-[state=active]:bg-[#F6FCEE] data-[state=active]:text-[#3C8C3C] data-[state=active]:font-semibold data-[state=active]:border-[#3C8C3C] rounded-xl py-2.5 px-4 text-gray-700 text-sm md:text-base font-medium shadow-sm transition-all duration-300"
                >
                  Benefits
                </TabsTrigger>
              )}
            </TabsList>

            {/* Ingredients */}
            {product.ingredients && product.ingredients.length > 0 && (
              <TabsContent value="ingredients" className="p-6 md:p-8">
                <h3 className="cursor-pointer font-bold text-[#3C3C3C] mb-4 text-lg md:text-xl">
                  Key Ingredients
                </h3>
                <div className="flex flex-wrap gap-3">
                  {product.ingredients.map((ingredient, idx) => (
                    <span
                      key={idx}
                      className="px-5 py-2.5 bg-[#F5F5F0] text-[#8B7355] rounded-full text-sm font-semibold hover:bg-[#8B7355] hover:text-white transition-colors"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* How to Use */}
            {product.usage && (
              <TabsContent value="usage" className="p-6 md:p-8">
                <div className="cursor-pointer space-y-3 text-gray-700 leading-relaxed">
                  {product.usage
                    .split("\n")
                    .map((line, idx) =>
                      line.trim() ? (
                        <p key={idx}>
                          <span className="text-green-700 font-semibold">{`Step ${idx + 1}: `}</span>
                          {line}
                        </p>
                      ) : null
                    )}
                </div>
              </TabsContent>
            )}

            {/* Suitable For */}
            {product.suitableFor && product.suitableFor.length > 0 && (
              <TabsContent value="suitable" className="p-6 md:p-8">
                <ul className="space-y-3 text-gray-700">
                  {product.suitableFor.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-[#8B7355] font-bold text-xl flex-shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            )}

            {/* Benefits */}
            {product.benefits && product.benefits.length > 0 && (
              <TabsContent value="benefits" className="p-6 md:p-8">
                <ul className="space-y-3 text-gray-700">
                  {product.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-[#8B7355] font-bold text-xl flex-shrink-0">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* FAQ Section */}
        <div className="border border-[#A08C6A] rounded-2xl bg-[#FFFCF7] overflow-hidden mb-10 mt-10">
          <FAQ companySlug={product.company?.slug} />
        </div>


        {/* Reviews Section */}
        <div className="border border-[#A08C6A] rounded-2xl bg-[#FFFCF7] p-6 md:p-10 mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Rating Summary */}
            <div className="border border-gray-300 rounded-xl bg-amber-50 p-6">
              {/* Header with verified badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900">Ratings & Reviews</h3>
                  <div className="w-px h-5 bg-gray-300"></div>
                  <div className="flex items-center gap-1.5">
                    <Image
                      src={VerifiedImage}
                      alt="verified"
                      width={16}
                      height={16}
                      className="inline-block w-4 h-4 ml-1"
                    />
                    <span className="text-sm text-gray-700">Only verified users</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold text-xs px-4 py-2 h-auto border border-blue-600 rounded-md cursor-pointer"
                  onClick={() => setShowReviewModal(true)}
                >
                  Rate Product
                </Button>
              </div>

              {/* Rating Score */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-5xl font-bold text-gray-900">{reviewSummary.averageRating.toFixed(1)}</span>
                <span className="text-amber-400 text-2xl">⭐</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">Based on {reviewSummary.total} Reviews</p>

              {/* Rating Bars */}
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-8">{rating} ★</span>
                    <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 transition-all duration-500 rounded-full"
                        style={{
                          width: `${ratingPercentage(rating as RatingKey)}%`,
                          display: ratingPercentage(rating as RatingKey) > 0 ? 'block' : 'none'
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-10 text-right">
                      ({reviewSummary.ratingCounts[rating as RatingKey] || 0})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Reviews List */}
            <div className="border border-gray-300 rounded-xl bg-amber-50 p-6">
              {/* Header with buttons */}
              <div className="flex items-center justify-between mb-5">
                {reviews.length > 0 && (
                  <button
                    className="bg-transparent hover:bg-blue-50 text-blue-500 font-semibold py-1.5 px-4 rounded-md text-sm border-2 border-blue-500 transition-colors ml-auto cursor-pointer"
                    onClick={() => setShowAllReviews(true)}
                  >
                    View all Review
                  </button>
                )}
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {reviewsLoading ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Loading reviews...</p>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <p className="font-medium text-sm">No reviews yet. Be the first to review!</p>
                  </div>
                ) : (
                  reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                      {/* User Info with Avatar */}
                      <div className="flex items-start gap-3 mb-2.5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                          {review.userName?.charAt(0).toUpperCase() || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm mb-0.5">{review.userName || "Anonymous"}</p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <img src={varifiedIcon.src} alt="verified" className="w-3.5 h-3.5" />
                              <span>Verified users</span>
                            </div>
                            {review.createdAt && (
                              <span className="text-gray-400">
                                • {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                <span className="ml-1 text-gray-500">({format(new Date(review.createdAt), "dd MMM yyyy")})</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Review Text */}
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 pl-13">
                        {review.comment}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Review Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">Write a Review</DialogTitle>
            </DialogHeader>

            {session?.user ? (
              <form className="space-y-6" onSubmit={(e) => {
                handleSubmitReview(e)
                setShowReviewModal(false)
              }}>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Your Rating *</p>
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setRatingInput(rating as RatingKey)}
                        onMouseEnter={() => setHoverRating(rating as RatingKey)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-10 w-10 ${(hoverRating || ratingInput) >= rating
                              ? "fill-amber-400 stroke-amber-400"
                              : "stroke-gray-300"
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Your Review *</p>
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={5}
                    placeholder="Share your experience with this product"
                    required
                    className="bg-white border-2 border-gray-200 focus:border-[#8B7355] rounded-lg resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-3">Name *</p>
                    <Input
                      value={userName}
                      onChange={(event) => setUserName(event.target.value)}
                      required
                      className="bg-white border-2 border-gray-200 focus:border-[#8B7355] rounded-lg"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-3">Email *</p>
                    <Input
                      type="email"
                      value={userEmail}
                      onChange={(event) => setUserEmail(event.target.value)}
                      required
                      className="bg-white border-2 border-gray-200 focus:border-[#8B7355] rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReviewModal(false)}
                    className="px-6 py-2 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingReview}
                    className="bg-[#8B7355] hover:bg-[#756045] text-white font-semibold py-2 px-8 rounded-lg"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Please{" "}
                  <Link href="/auth/login" className="text-[#8B7355] font-semibold underline hover:text-[#756045]">
                    sign in
                  </Link>{" "}
                  to submit a review.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* All Reviews Modal */}
        <Dialog open={showAllReviews} onOpenChange={setShowAllReviews}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">All Reviews ({reviews.length})</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {reviews.map((review) => (
                <div key={review.id} className="pb-5 border-b border-gray-100 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-3 mb-2.5">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {review.userName?.charAt(0).toUpperCase() || "A"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-gray-900 text-sm">{review.userName || "Anonymous"}</p>
                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 font-semibold mb-1.5">Verify users</p>
                      {review.createdAt && (
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          <span className="ml-1 text-gray-500">({format(new Date(review.createdAt), "dd MMM yyyy")})</span>
                        </p>
                      )}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${review.rating >= star ? "fill-amber-400 stroke-amber-400" : "fill-gray-200 stroke-gray-200"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed mb-3">{review.comment}</p>
                  {review.reply && (
                    <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-lg p-4">
                      <p className="text-xs font-bold text-gray-900 mb-1">
                        <span className="text-blue-600">Instapeels</span> replied
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed">{review.reply.message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

         <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {showImageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-auto shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 z-50 bg-white hover:bg-gray-100 text-gray-800 p-1.5 rounded-full transition-all shadow-lg hover:shadow-xl"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-3 sm:p-4">
              {/* Main Image Display */}
              <div className="relative w-full aspect-square bg-[#F5F5F0] rounded-lg sm:rounded-xl overflow-hidden mb-3">
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />

                {/* Navigation Arrows - Cleaner Design */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage((prev) => (prev > 0 ? prev - 1 : product.images.length - 1))}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-1.5 rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedImage((prev) => (prev < product.images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-1.5 rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-gray-800 px-2.5 py-1 rounded-full text-xs font-medium shadow-md">
                  {selectedImage + 1} / {product.images.length}
                </div>
              </div>

              {/* Horizontal Thumbnail Strip - For All Screen Sizes */}
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory hide-scrollbar">
                  {product.images?.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                        selectedImage === idx
                          ? "border-[#8B7355] shadow-md scale-105"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${idx + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            
          </div>
        </div>
      )}
    </div>
        {/* Bulk Order Modal */}
        <Dialog open={showBulkOrderModal} onOpenChange={setShowBulkOrderModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Want to do a bulk order?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You've reached the maximum of 5 products in your cart. For bulk orders, please contact us directly.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <p className="font-semibold text-sm text-gray-900">Contact Our Team:</p>
                <div className="space-y-2">
                  <a
                    href="tel:+919820623835"
                    className="flex items-center gap-3 p-2 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">+91 9820623835</span>
                  </a>
                  <a
                    href="tel:+919819079079"
                    className="flex items-center gap-3 p-2 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">+91 9819079079</span>
                  </a>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowBulkOrderModal(false)}
                >
                  Continue Shopping
                </Button>
                <Button
                  className="flex-1"
                  style={{ backgroundColor: "#B18D0C" }}
                  onClick={() => {
                    window.location.href = "tel:+919820623835"
                  }}
                >
                  Call Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        {/* Suggested Products */}
        {suggestedProducts.length > 0 && (
          <div className="border border-gray-300 rounded-xl bg-purple-50 p-6 md:p-10 mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">Recent View Products</h3>
            <div className="w-full overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
                {suggestedProducts.map((suggestedProduct) => (
                  <div
                    key={suggestedProduct._id}
                    className="flex-shrink-0 w-[240px] sm:w-auto"
                  >
                    <ProductCard
                      id={suggestedProduct._id}
                      name={suggestedProduct.name}
                      price={suggestedProduct.price}
                      discountPrice={suggestedProduct.discountPrice}
                      image={suggestedProduct.image}
                      company={suggestedProduct.company as any}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

   .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .no-scrollbar {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
      }
`}</style>
      </div>
    </main>
  )
})

ProductDetailPage.displayName = 'ProductDetailPage'

export default ProductDetailPage
