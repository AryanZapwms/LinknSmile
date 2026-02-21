"use client"

import { FormEvent, useCallback, useEffect, useRef, useState, useMemo, memo } from "react"
import { useParams, useRouter } from "next/navigation"
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
import VerifiedImage from '@/assets/verifiedtick.png'
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"
import { trackViewContent, trackAddToCart } from "@/lib/facebook-pixel"
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

function suggestedProductsCacheKey(productId: string) {
  return `suggested:products:${productId}`
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

async function fetchSuggestedProductsAPI(productId: string): Promise<SuggestedProduct[]> {
  const params = new URLSearchParams({
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
  slug: string
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
  slug: string
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
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { data: session, status } = useSession()
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

        // Fetch suggested products
        loadSuggested()

      } catch (error) {
        console.error("Error fetching product:", error)
        if (!mounted) return
        setProduct(null)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    async function loadSuggested() {
      try {
        const data = await fetchWithCache<SuggestedProduct[]>(
          suggestedProductsCacheKey(id),
          () => fetchSuggestedProductsAPI(id),
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

    if (status !== "authenticated") {
      toast({
        title: "Login required",
        description: "Please sign in to add products to your cart.",
        variant: "destructive",
      })
      router.push(`/auth/login?callback=/products/${id}`)
      return
    }

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

    const productAny = product as any;
    addItem({
      productId: id,
      name: product.name,
      price: selectedSize ? selectedSize.price : product.price,
      discountPrice: selectedSize ? selectedSize.discountPrice : product.discountPrice,
      image: product.image,
      quantity,
      slug: product.slug,
      stock: selectedSize ? selectedSize.stock : product.stock,
      selectedSize: selectedSize || undefined,
      shopId: (typeof productAny.shopId === 'object' ? productAny.shopId?._id : productAny.shopId),
      shopName: (typeof productAny.shopId === 'object' ? productAny.shopId?.shopName : "LinkAndSmile Platform"),
      commissionRate: (typeof productAny.shopId === 'object' ? productAny.shopId?.commissionRate : 10) || 10,
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
                        {size.size} ({size.quantity}{size.unit}) - ₹{size.discountPrice ? size.discountPrice : size.price}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3 hover:bg-gray-100 transition-colors text-gray-600 font-bold text-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={selectedSize ? selectedSize.stock : product.stock}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      const maxStock = selectedSize ? selectedSize.stock : product.stock;
                      setQuantity(Math.min(val, maxStock))
                    }}
                    className="w-16 text-center border-x-2 border-gray-300 py-3 font-bold text-gray-900 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const maxStock = selectedSize ? selectedSize.stock : product.stock;
                      if (quantity < maxStock) setQuantity(quantity + 1)
                      else {
                        toast({
                          title: "Max stock reached",
                          description: `Only ${maxStock} items available in stock.`,
                          variant: "destructive",
                        })
                      }
                    }}
                    className="px-4 py-3 hover:bg-gray-100 transition-colors text-gray-600 font-bold text-lg"
                  >
                    +
                  </button>
                </div>

                <Button
                  className="flex-1 h-14 text-lg font-bold bg-[#7c3aed] hover:bg-[#6d28d9] shadow-lg shadow-purple-200 transition-all hover:scale-[1.02]"
                  onClick={handleAddToCart}
                  disabled={selectedSize ? selectedSize.stock === 0 : product.stock === 0}
                >
                  {(selectedSize ? selectedSize.stock === 0 : product.stock === 0) ? "Out of Stock" : "Add to Cart"}
                </Button>
              </div>

              {/* Product Info Tabs - Using default Shadcn Tabs */}
              <div className="mt-8">
                <Tabs defaultValue="ingredients" onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-purple-50 p-1 mb-6 rounded-xl">
                    <TabsTrigger 
                      value="ingredients"
                      className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm rounded-lg py-2.5 font-semibold transition-all"
                    >
                      Ingredients
                    </TabsTrigger>
                    <TabsTrigger 
                      value="benefits"
                      className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm rounded-lg py-2.5 font-semibold transition-all"
                    >
                      Benefits
                    </TabsTrigger>
                    <TabsTrigger 
                      value="usage"
                      className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm rounded-lg py-2.5 font-semibold transition-all"
                    >
                      How to Use
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm min-h-[200px]">
                    <TabsContent value="ingredients" className="mt-0 animate-in fade-in-50 duration-300">
                      <div className="flex flex-wrap gap-2">
                        {product.ingredients?.map((ing, i) => (
                          <span key={i} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-purple-100">
                            {ing}
                          </span>
                        ))}
                        {(!product.ingredients || product.ingredients.length === 0) && (
                          <p className="text-gray-500 italic">No ingredients listed.</p>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="benefits" className="mt-0 animate-in fade-in-50 duration-300">
                      <ul className="space-y-3">
                        {product.benefits?.map((benefit, i) => (
                          <li key={i} className="flex gap-3 text-gray-700 group">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 flex items-center justify-center mt-0.5 group-hover:bg-green-100 transition-colors">
                              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                        {(!product.benefits || product.benefits.length === 0) && (
                          <p className="text-gray-500 italic">No benefits listed.</p>
                        )}
                      </ul>
                    </TabsContent>
                    
                    <TabsContent value="usage" className="mt-0 animate-in fade-in-50 duration-300">
                      <div className="prose prose-purple max-w-none text-gray-700">
                        <p>{product.usage || "No usage instructions provided."}</p>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>

          =
        </div>

        {/* Suggested Products */}
        {suggestedProducts.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">You May Also Like</h2>
              <Link href="/products" className="text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {suggestedProducts.map((p) => (
                <ProductCard
                  key={p._id}
                  id={p._id}
                  name={p.name}
                  price={p.price}
                  discountPrice={p.discountPrice}
                  image={p.image}
                  slug={p.slug}
                  size="sm"
                />
              ))}
            </div>
          </section>
        )}

      </div>

      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <button 
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-50 text-white/70 hover:text-white bg-black/50 rounded-full p-2"
            >
              <X className="w-8 h-8" />
            </button>
            
            {product.images && product.images.length > 0 && (
              <div className="relative w-full h-full">
                <Image
                  src={product.images[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            )}
            
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 overflow-x-auto max-w-[90vw] p-2 bg-black/50 rounded-xl backdrop-blur-sm">
              {product.images?.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === idx ? "border-white scale-105" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${idx}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
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
                style={{ backgroundColor: "#7c3aed" }}
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

    </main>
  )
})

export default ProductDetailPage
