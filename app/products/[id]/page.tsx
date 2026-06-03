// app/products/[id]/page.tsx
"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import FavouriteButton from "@/components/FavouriteButton";
import {
  Star,
  X,
  Phone,
  ChevronRight,
  Store,
  Truck,
  ShieldCheck,
  Award,
  PackageCheck,
  ZoomIn,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCartStore } from "@/lib/store/cart-store";
import { ProductCard } from "@/components/product-card";
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient";
import { trackViewContent, trackAddToCart } from "@/lib/facebook-pixel";
import { useToast } from "@/hooks/use-toast";

/* ─── Cache ────────────────── */
const TTL = 1000 * 60 * 5;
const MAX_AGE = 1000 * 60 * 60 * 24;
const productKey = (id: string) => `product:${id}`;
const reviewsKey = (id: string) => `product:reviews:${id}`;
const suggestedKey = (id: string) => `suggested:products:${id}`;

/* ─── API fetchers ─────────── */
async function fetchProductAPI(id: string) {
  const res = await fetch(`/api/products/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const data = await res.json();
  if (!data?._id) throw new Error("Invalid product data");
  return data;
}
async function fetchReviewsAPI(id: string) {
  const res = await fetch(`/api/products/${id}/reviews`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}
async function fetchSuggestedAPI(id: string) {
  const res = await fetch(`/api/products?limit=6&exclude=${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const d = await res.json();
  return d.products || [];
}

/* ─── Types ────────────────── */
interface Size {
  size: string;
  unit: "ml" | "l" | "g" | "kg";
  quantity: number;
  price: number;
  discountPrice?: number;
  stock: number;
  sku?: string;
}
interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  image: string;
  images: string[];
  stock: number;
  ingredients: string[];
  benefits: string[];
  usage: string;
  sizes?: Size[];
  mrp: string;
  company?: { _id: string; name: string; slug: string };
  shopId?: { _id: string; shopName: string; commissionRate: number } | string;
}
interface SuggestedProduct {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  slug: string;
}
type RatingKey = 1 | 2 | 3 | 4 | 5;
interface ReviewSummary {
  total: number;
  averageRating: number;
  ratingCounts: Record<RatingKey, number>;
}
interface ProductReview {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  reply: { message: string; repliedAt: string } | null;
  createdAt: string;
}

const defaultSummary: ReviewSummary = {
  total: 0,
  averageRating: 0,
  ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function parseSummary(s: any): ReviewSummary {
  if (!s) return { ...defaultSummary, ratingCounts: { ...defaultSummary.ratingCounts } };
  return {
    total: s.total ?? 0,
    averageRating: s.averageRating ?? 0,
    ratingCounts: {
      1: s.ratingCounts?.[1] ?? 0,
      2: s.ratingCounts?.[2] ?? 0,
      3: s.ratingCounts?.[3] ?? 0,
      4: s.ratingCounts?.[4] ?? 0,
      5: s.ratingCounts?.[5] ?? 0,
    },
  };
}
function parseReview(r: any): ProductReview {
  const id = (v: any) => (typeof v === "string" ? v : (v?._id?.toString?.() ?? ""));
  return {
    id: id(r?.id ?? r?._id),
    rating: Number(r?.rating) || 0,
    comment: r?.comment ?? "",
    userName: r?.userName ?? "",
    reply: r?.reply?.message
      ? { message: r.reply.message, repliedAt: r.reply.repliedAt ?? "" }
      : null,
    createdAt: r?.createdAt ?? "",
  };
}

/* ─── Stars ────────────────── */
function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${i <= Math.floor(rating) ? "fill-amber-400 text-amber-400" : i - 0.5 <= rating ? "fill-amber-200 text-amber-400" : "fill-stone-100 text-stone-300"}`}
        />
      ))}
    </div>
  );
}

/* ─── Skeleton ─────────────── */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-100 ${className}`} />;
}

/* ─── Page ─────────────────── */
const ProductDetailPage = memo(function ProductDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const addItem = useCartStore((s) => s.addItem);
  const getTotalItems = useCartStore((s) => s.getTotalItems);

  const initialProduct = useMemo(() => getCachedSync<Product>(productKey(id), MAX_AGE), [id]);
  const initialReviews = useMemo(
    () => getCachedSync<{ reviews: any[]; summary: any }>(reviewsKey(id), MAX_AGE),
    [id]
  );

  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [suggested, setSuggested] = useState<SuggestedProduct[]>([]);
  const [loading, setLoading] = useState(!initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>(
    initialReviews ? (initialReviews.reviews || []).map(parseReview) : []
  );
  const [summary, setSummary] = useState<ReviewSummary>(
    initialReviews ? parseSummary(initialReviews.summary) : defaultSummary
  );
  const [reviewsLoading, setReviewsLoading] = useState(!initialReviews);
  const [ratingInput, setRatingInput] = useState<RatingKey | 0>(0);
  const [hoverRating, setHoverRating] = useState<RatingKey | 0>(0);
  const [comment, setComment] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reviewsFetchRef = useRef(false);

  // Load product
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchWithCache<Product>(productKey(id), () => fetchProductAPI(id), {
      ttlMs: TTL,
      maxAgeMs: MAX_AGE,
      backgroundRefresh: true,
      persistToStorage: true,
    })
      .then((data) => {
        if (!mounted) return;
        setProduct(data);
        trackViewContent(data._id, data.name, data.discountPrice || data.price);
        fetchWithCache<SuggestedProduct[]>(suggestedKey(id), () => fetchSuggestedAPI(id), {
          ttlMs: TTL,
          maxAgeMs: MAX_AGE,
          backgroundRefresh: true,
          persistToStorage: true,
        })
          .then((s) => {
            if (mounted) setSuggested(s);
          })
          .catch(() => {});
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  // Auto-select first size
  useEffect(() => {
    if (product?.sizes?.length && !selectedSize) {
      const first = product.sizes.find((s) => s.stock > 0);
      if (first) setSelectedSize(first);
    }
  }, [product]);

  // Load reviews
  const loadReviews = useCallback(async () => {
    if (!id || reviewsFetchRef.current) return;
    reviewsFetchRef.current = true;
    setReviewsLoading(true);
    try {
      const data = await fetchWithCache<{ reviews: any[]; summary: any }>(
        reviewsKey(id),
        () => fetchReviewsAPI(id),
        { ttlMs: TTL * 2, maxAgeMs: MAX_AGE, backgroundRefresh: false, persistToStorage: true }
      );
      setReviews((data.reviews || []).map(parseReview));
      setSummary(parseSummary(data.summary));
    } catch {
      setReviews([]);
      setSummary({ ...defaultSummary, ratingCounts: { ...defaultSummary.ratingCounts } });
    } finally {
      reviewsFetchRef.current = false;
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!initialReviews) loadReviews();
  }, [initialReviews, loadReviews]);
  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setUserName(session.user.name);
      if (session.user.email) setUserEmail(session.user.email);
    }
  }, [session]);

  const handleAddToCart = () => {
    if (!product) return;
    if (status !== "authenticated") {
      toast({ title: "Login required", variant: "destructive" });
      router.push(`/auth/login?callback=/products/${id}`);
      return;
    }
    if (getTotalItems() >= 5) {
      setShowBulkModal(true);
      return;
    }
    if (product.sizes?.length && !selectedSize) {
      toast({ title: "Size required", variant: "destructive" });
      return;
    }
    const stockCheck = selectedSize ? selectedSize.stock : product.stock;
    if (stockCheck === 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    const p = product as any;
    addItem({
      productId: id,
      name: product.name,
      price: selectedSize?.price ?? product.price,
      discountPrice: selectedSize?.discountPrice ?? product.discountPrice,
      image: product.image,
      quantity,
      slug: product.slug,
      stock: stockCheck,
      selectedSize: selectedSize || undefined,
      shopId: typeof p.shopId === "object" ? p.shopId?._id : p.shopId,
      shopName: typeof p.shopId === "object" ? p.shopId?.shopName : "LinkAndSmile",
      commissionRate: (typeof p.shopId === "object" ? p.shopId?.commissionRate : 10) || 10,
    });
    trackAddToCart(
      product._id,
      product.name,
      (selectedSize?.discountPrice ?? product.discountPrice) ||
        (selectedSize?.price ?? product.price),
      quantity
    );
    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.name}${selectedSize ? ` (${selectedSize.size})` : ""}`,
    });
    setQuantity(1);
  };

  const handleSubmitReview = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !session?.user?.id) {
      toast({ title: "Login required", variant: "destructive" });
      return;
    }
    if (!ratingInput || !comment.trim() || !userName.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingInput, comment, userName, userEmail }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed", description: err.error, variant: "destructive" });
        return;
      }
      const data = await res.json();
      if (data.review)
        setReviews((prev) => [
          parseReview(data.review),
          ...prev.filter((r) => r.id !== parseReview(data.review).id),
        ]);
      setSummary(parseSummary(data.summary));
      setRatingInput(0);
      setHoverRating(0);
      setComment("");
      toast({ title: "Review submitted!" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const img = el.querySelector("img") as HTMLImageElement;
    if (img) {
      img.style.transformOrigin = `${x}% ${y}%`;
      img.style.transform = "scale(2)";
    }
  };
  const handleMouseLeave = () => {
    const img = containerRef.current?.querySelector("img") as HTMLImageElement;
    if (img) {
      img.style.transition = "transform 0.2s ease-out";
      img.style.transform = "scale(1)";
    }
  };

  /* ─── Loading ─── */
  if (loading)
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            </div>
            <div className="space-y-5">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className={`h-${[10, 6, 8, 6, 12, 10][i]} w-full`} />
              ))}
            </div>
          </div>
        </div>
      </main>
    );

  if (!product)
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-stone-400">Product not found</p>
      </main>
    );

  const currentPrice = selectedSize?.price ?? product.price;
  const currentDiscountPrice = selectedSize?.discountPrice ?? product.discountPrice;
  const discount = currentDiscountPrice
    ? Math.round(((currentPrice - currentDiscountPrice) / currentPrice) * 100)
    : 0;
  const displayPrice = currentDiscountPrice || currentPrice;
  const hasSizes = product.sizes && product.sizes.length > 0;
  const isOutOfStock = selectedSize ? selectedSize.stock === 0 : product.stock === 0;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 text-xs text-stone-400">
          <Link href="/" className="transition-colors hover:text-stone-600">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="transition-colors hover:text-stone-600">
            Products
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="line-clamp-1 text-stone-600">{product.name}</span>
        </nav>

        {/* Main grid */}
        <div className="mb-16 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* ── Images ── */}
          <div className="space-y-3">
            <div
              ref={containerRef}
              className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={() => setShowImageModal(true)}
            >
              {product.images?.[selectedImage] ? (
                <Image
                  src={product.images[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-200"
                  style={{ transformOrigin: "center" }}
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-stone-300">
                  No image
                </div>
              )}

              {discount > 0 && (
                <div className="absolute top-3 left-3 z-10 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                  {discount}% OFF
                </div>
              )}
              <button className="absolute right-3 bottom-3 rounded-xl bg-white/80 p-2 text-stone-600 backdrop-blur-sm transition-colors hover:bg-white">
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
              {product.images?.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${i === selectedImage ? "border-amber-400 shadow-sm" : "border-stone-100 hover:border-stone-300"}`}
                >
                  <Image src={img} alt={`${product.name} ${i}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Details ── */}
          <div className="space-y-6">
            {/* Title + rating */}
            <div>
              <h1 className="mb-3 text-2xl leading-tight font-bold text-stone-900 md:text-3xl">
                {product.name}
              </h1>
              <div className="flex items-center gap-3">
                <Stars rating={summary.averageRating} size="md" />
                <span className="text-sm font-semibold text-stone-700">
                  {summary.averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-stone-400">({summary.total} reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-end gap-4 border-y border-stone-100 py-4">
              <div>
                <p className="text-4xl font-black text-stone-900">
                  ₹{displayPrice.toLocaleString()}
                </p>
                {currentDiscountPrice && (
                  <p className="mt-0.5 text-sm text-stone-400 line-through">
                    MRP ₹{currentPrice.toLocaleString()}
                  </p>
                )}
              </div>
              {discount > 0 && (
                <span className="mb-1 inline-flex items-center rounded-full border border-green-100 bg-green-50 px-3 py-1 text-sm font-bold text-green-700">
                  {discount}% off
                </span>
              )}
              <span className="mb-1 ml-auto rounded-lg border border-stone-100 bg-stone-50 px-2 py-1 text-xs text-stone-400">
                Incl. all taxes
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <p
                  className={`text-sm leading-relaxed text-stone-600 ${!expanded ? "line-clamp-3" : ""}`}
                >
                  {product.description}
                </p>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1 text-xs font-semibold text-amber-600 transition-colors hover:text-amber-700"
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              </div>
            )}

            {/* Size selector */}
            {hasSizes && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-700">
                  Select Size
                </label>
                <select
                  value={selectedSize ? `${selectedSize.size}-${selectedSize.quantity}` : ""}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setSelectedSize(null);
                      return;
                    }
                    setSelectedSize(
                      product.sizes!.find((s) => `${s.size}-${s.quantity}` === e.target.value) ||
                        null
                    );
                  }}
                  className="w-full cursor-pointer rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition-colors focus:border-amber-400 focus:outline-none"
                >
                  <option value="">Choose a size…</option>
                  {product.sizes!.map((s, i) => (
                    <option key={i} value={`${s.size}-${s.quantity}`} disabled={s.stock === 0}>
                      {s.size} ({s.quantity}
                      {s.unit}) — ₹{s.discountPrice ?? s.price}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Qty + Add + Wishlist */}
            <div className="flex items-center gap-3">
              {/* Quantity */}
              <div className="flex items-center overflow-hidden rounded-xl border-2 border-stone-200">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-3 text-stone-600 transition-colors hover:bg-stone-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 border-x-2 border-stone-200 py-3 text-center text-sm font-bold text-stone-900">
                  {quantity}
                </span>
                <button
                  onClick={() => {
                    const max = selectedSize?.stock ?? product.stock;
                    if (quantity < max) setQuantity(quantity + 1);
                    else toast({ title: `Only ${max} in stock`, variant: "destructive" });
                  }}
                  className="px-3 py-3 text-stone-600 transition-colors hover:bg-stone-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add to cart */}
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`h-12 flex-1 rounded-xl text-sm font-bold transition-all duration-150 ${
                  isOutOfStock
                    ? "cursor-not-allowed bg-stone-100 text-stone-400"
                    : "bg-stone-900 text-white hover:bg-stone-800 hover:shadow-lg active:scale-[0.98]"
                }`}
              >
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>

              {/* Wishlist */}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-stone-200 transition-all hover:border-red-200">
                <FavouriteButton type="product" refId={id} />
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                {
                  icon: Truck,
                  label: "Fast Delivery",
                  sub: "3–5 days",
                  color: "text-green-600 bg-green-50",
                },
                {
                  icon: ShieldCheck,
                  label: "Authentic",
                  sub: "Verified seller",
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  icon: PackageCheck,
                  label: "Easy Return",
                  sub: "7-day policy",
                  color: "text-amber-600 bg-amber-50",
                },
              ].map(({ icon: Icon, label, sub, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 rounded-xl border border-stone-100 bg-stone-50 p-3 text-center"
                >
                  <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-stone-800">{label}</p>
                  <p className="text-[10px] text-stone-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Brand / seller */}
            {(product.company || (product.shopId && typeof product.shopId === "object")) && (
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                {product.shopId && typeof product.shopId === "object" && (
                  <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-100 bg-white">
                      <Store className="h-4 w-4 text-stone-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                        Sold by
                      </p>
                      <p className="text-sm font-semibold text-stone-800">
                        {(product.shopId as any).shopName}
                      </p>
                    </div>
                  </div>
                )}
                {product.company && (
                  <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-100 bg-white">
                      <Award className="h-4 w-4 text-stone-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                        Brand
                      </p>
                      <Link
                        href={`/shop/${product.company.slug}`}
                        className="text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
                      >
                        {product.company.name}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="pt-2">
              <Tabs defaultValue="ingredients">
                <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-stone-100 p-1">
                  {["ingredients", "benefits", "usage"].map((t) => (
                    <TabsTrigger
                      key={t}
                      value={t}
                      className="rounded-lg py-2 text-xs font-semibold text-stone-500 capitalize transition-all data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm"
                    >
                      {t === "usage" ? "How to Use" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="mt-3 min-h-[120px] rounded-xl border border-stone-100 bg-stone-50 p-4">
                  <TabsContent value="ingredients" className="mt-0">
                    <div className="flex flex-wrap gap-2">
                      {product.ingredients?.map((ing, i) => (
                        <span
                          key={i}
                          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700"
                        >
                          {ing}
                        </span>
                      ))}
                      {!product.ingredients?.length && (
                        <p className="text-sm text-stone-400 italic">No ingredients listed.</p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="benefits" className="mt-0">
                    <ul className="space-y-2">
                      {product.benefits?.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-600">
                            ✓
                          </span>
                          {b}
                        </li>
                      ))}
                      {!product.benefits?.length && (
                        <p className="text-sm text-stone-400 italic">No benefits listed.</p>
                      )}
                    </ul>
                  </TabsContent>
                  <TabsContent value="usage" className="mt-0">
                    <p className="text-sm leading-relaxed text-stone-600">
                      {product.usage || "No usage instructions provided."}
                    </p>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section className="mb-16 border-t border-stone-100 pt-12">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">Customer Reviews</h2>
            {summary.total > 0 && (
              <div className="flex items-center gap-2">
                <Stars rating={summary.averageRating} />
                <span className="text-sm font-semibold text-stone-700">
                  {summary.averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-stone-400">({summary.total})</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            {/* Review list */}
            <div className="space-y-4">
              {reviewsLoading && <div className="text-sm text-stone-400">Loading reviews…</div>}
              {!reviewsLoading && reviews.length === 0 && (
                <p className="text-sm text-stone-400 italic">No reviews yet. Be the first!</p>
              )}
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                        {r.userName?.[0]?.toUpperCase() || "U"}
                      </div>
                      <span className="text-sm font-semibold text-stone-800">
                        {r.userName || "Anonymous"}
                      </span>
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  <p className="text-sm leading-relaxed text-stone-600">{r.comment}</p>
                  {r.reply && (
                    <div className="mt-3 border-l-2 border-amber-200 pl-3">
                      <p className="mb-0.5 text-xs font-semibold text-amber-700">Seller reply</p>
                      <p className="text-xs text-stone-500">{r.reply.message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Write review */}
            <div>
              <h3 className="mb-4 text-base font-bold text-stone-900">Write a Review</h3>
              {status !== "authenticated" ? (
                <div className="rounded-2xl border border-stone-100 bg-stone-50 p-6 text-center">
                  <p className="mb-4 text-sm text-stone-500">Sign in to leave a review</p>
                  <button
                    onClick={() => router.push(`/auth/login?callback=/products/${id}`)}
                    className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Stars */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold tracking-wider text-stone-500 uppercase">
                      Your Rating
                    </label>
                    <div className="flex gap-1">
                      {([1, 2, 3, 4, 5] as RatingKey[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRatingInput(s)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-7 w-7 transition-all ${(hoverRating || ratingInput) >= s ? "fill-amber-400 text-amber-400" : "fill-stone-100 text-stone-300"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience…"
                    rows={3}
                    className="w-full resize-none rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 transition-colors focus:border-amber-400 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your name"
                      className="rounded-xl border-2 border-stone-200 px-3 py-2.5 text-sm transition-colors focus:border-amber-400 focus:outline-none"
                    />
                    <input
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                      className="rounded-xl border-2 border-stone-200 px-3 py-2.5 text-sm transition-colors focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-bold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : "Submit Review"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Suggested */}
        {suggested.length > 0 && (
          <section className="border-t border-stone-100 pt-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900">You May Also Like</h2>
              <Link
                href="/products"
                className="flex items-center gap-1 text-sm font-medium text-amber-600 transition-colors hover:text-amber-700"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {suggested.map((p) => (
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

      {/* Image modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="h-[90vh] max-w-4xl overflow-hidden rounded-2xl border-none bg-black/95 p-0">
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {product.images?.[selectedImage] && (
            <div className="relative h-full w-full">
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}
          <div className="absolute bottom-4 left-1/2 flex max-w-[80vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-xl bg-black/50 p-2 backdrop-blur-sm">
            {product.images?.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`relative h-14 w-14 overflow-hidden rounded-lg border-2 transition-all ${i === selectedImage ? "border-white" : "border-transparent opacity-50 hover:opacity-80"}`}
              >
                <Image src={img} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk order modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Need a bulk order?</DialogTitle>
          </DialogHeader>
          <p className="mb-4 text-sm text-stone-500">
            You've reached the 5-item cart limit. Contact us for bulk orders.
          </p>
          <div className="mb-4 space-y-2">
            {["+91 9820623835", "+91 9819079079"].map((n) => (
              <a
                key={n}
                href={`tel:${n.replace(/\s/g, "")}`}
                className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3 transition-colors hover:border-amber-200 hover:bg-amber-50"
              >
                <Phone className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-stone-700">{n}</span>
              </a>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setShowBulkModal(false)}
            >
              Continue
            </Button>
            <Button
              className="flex-1 rounded-xl bg-stone-900 hover:bg-stone-800"
              onClick={() => {
                window.location.href = "tel:+919820623835";
              }}
            >
              Call Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
});

export default ProductDetailPage;
