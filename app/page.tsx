// app/page.tsx
"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { ProductCard } from "@/components/product-card"
import { HomeCarousel } from "@/components/home-carousel"
import { CategorySlider } from "@/components/category-slider"
import WhyChoose from "@/components/why-choose"
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"

interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  slug: string
}

interface Review {
  id: string
  productName: string
  productImage: string
  productId: string
  customerName: string
  rating: number
  comment: string
}

/* ─── Cache config ───────────────────────────── */
const SUGGESTED_PRODUCTS_KEY = "home:products:suggested:8"
const ALL_PRODUCTS_KEY = "home:products:all:100"
const REVIEWS_KEY = "home:reviews:all"
const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24

/* ─── API fetchers ───────────────────────────── */
async function fetchSuggestedProductsAPI(): Promise<Product[]> {
  const res = await fetch("/api/products?limit=8", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch suggested products")
  const json = await res.json()
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.products)) return json.products
  if (Array.isArray(json?.data)) return json.data
  return []
}

async function fetchAllProductsAPI(): Promise<Product[]> {
  const res = await fetch("/api/products?limit=100", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch all products")
  const json = await res.json()
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.products)) return json.products
  if (Array.isArray(json?.data)) return json.data
  return []
}

async function fetchReviewsAPI(): Promise<Review[]> {
  const res = await fetch("/api/products/reviews/all", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch reviews")
  const json = await res.json()
  const raw = Array.isArray(json) ? json : json?.reviews ?? json?.data ?? []
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 20).map((r: any) => ({
    id: r.id || r._id || `${Math.random()}`,
    productName: r.productName || r.product?.name || "Product",
    productImage: r.productImage || r.product?.image || "/placeholder.jpg",
    productId: r.productId || r.product?._id || "",
    customerName: r.userName || r.customerName || r.name || "Anonymous",
    rating: typeof r.rating === "number" ? r.rating : 5,
    comment: r.comment || r.review || "",
  }))
}

export function invalidateHomeCaches() {
  invalidateCache(SUGGESTED_PRODUCTS_KEY)
  invalidateCache(ALL_PRODUCTS_KEY)
  invalidateCache(REVIEWS_KEY)
}

/* ─── Skeleton card ──────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-stone-100 animate-pulse overflow-hidden">
      <div className="aspect-square bg-stone-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-stone-200 rounded w-3/4" />
        <div className="h-3 bg-stone-200 rounded w-1/2" />
      </div>
    </div>
  )
}

/* ─── Section wrapper ────────────────────────── */
function Section({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">{title}</h2>
          <p className="text-sm text-stone-500 mt-1">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ─── Main component ─────────────────────────── */
export default function Home() {
  const initialSuggestedProducts = useMemo(
    () => (typeof window === "undefined" ? [] : getCachedSync<Product[]>(SUGGESTED_PRODUCTS_KEY, MAX_AGE) ?? []),
    []
  )
  const initialAllProducts = useMemo(
    () => (typeof window === "undefined" ? [] : getCachedSync<Product[]>(ALL_PRODUCTS_KEY, MAX_AGE) ?? []),
    []
  )
  const initialReviews = useMemo(
    () => (typeof window === "undefined" ? [] : getCachedSync<Review[]>(REVIEWS_KEY, MAX_AGE) ?? []),
    []
  )

  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>(initialSuggestedProducts)
  const [allProducts, setAllProducts] = useState<Product[]>(initialAllProducts)
  const [loading, setLoading] = useState(initialAllProducts.length === 0)
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [showTopButton, setShowTopButton] = useState(false)
  const [waMenuOpen, setWaMenuOpen] = useState(false)
  const waMenuRef = useRef<HTMLDivElement | null>(null)
  const waButtonRef = useRef<HTMLButtonElement | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    let mounted = true
    fetchWithCache<Product[]>(SUGGESTED_PRODUCTS_KEY, fetchSuggestedProductsAPI, {
      ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true,
    }).then((data) => { if (mounted) setSuggestedProducts(data) }).catch(console.error)
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchWithCache<Product[]>(ALL_PRODUCTS_KEY, fetchAllProductsAPI, {
      ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true,
    }).then((data) => { if (mounted) setAllProducts(data) })
      .catch(console.error)
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    fetchWithCache<Review[]>(REVIEWS_KEY, fetchReviewsAPI, {
      ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true,
    }).then((data) => { if (mounted && data?.length > 0) setReviews(data) })
      .catch(console.error)
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const onScroll = () => setShowTopButton(window.scrollY > 300)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (!waMenuRef.current || (waButtonRef.current && waButtonRef.current.contains(target))) return
      if (!waMenuRef.current.contains(target)) setWaMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setWaMenuOpen(false) }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("touchstart", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("touchstart", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  const PRIMARY_WA = "9321179079"
  const SECONDARY_WA = "9819079079"
  const buildWaLink = (n: string) => `https://wa.me/${n}`
  const openWaFor = (n: string) => { window.open(buildWaLink(n), "_blank", "noopener,noreferrer"); setWaMenuOpen(false) }

  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero Carousel ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2">
        <HomeCarousel />
      </section>

      {/* ── Promo ticker ──────────────────────────── */}
      <div className="bg-stone-900 overflow-hidden py-2.5">
        <div className="flex animate-[marquee_28s_linear_infinite] whitespace-nowrap">
          {[...Array(3)].fill(null).map((_, i) => (
            <span key={i} className="flex items-center gap-6 px-6 text-xs text-stone-300 font-medium tracking-wider shrink-0">
              <span className="text-amber-400">✦</span> FREE SHIPPING ABOVE ₹499
              <span className="text-amber-400">✦</span> 100% AUTHENTIC PRODUCTS
              <span className="text-amber-400">✦</span> EASY 7-DAY RETURNS
              <span className="text-amber-400">✦</span> VERIFIED LOCAL SELLERS
              <span className="text-amber-400">✦</span> MADE IN INDIA
              <span className="text-amber-400">✦</span> SECURE PAYMENTS
            </span>
          ))}
        </div>
      </div>

      {/* ── Categories ────────────────────────────── */}
      <section className="bg-white">
        <CategorySlider />
      </section>

      {/* ── Suggested Products ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <Section
          title="Suggested For You"
          subtitle="Handpicked products from our trusted partners"
          action={
            <a href="/products" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors hidden sm:inline-flex items-center gap-1">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {!isClient || suggestedProducts.length === 0
              ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
              : suggestedProducts.map((p) => (
                  <ProductCard
                    key={p._id}
                    id={p._id}
                    name={p.name}
                    price={p.price}
                    discountPrice={p.discountPrice}
                    image={p.image}
                    slug={p.slug}
                  />
                ))}
          </div>
        </Section>
      </section>

      {/* ── Banner strip ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
          <div className="relative z-10 text-center sm:text-left">
            <p className="text-xs font-bold text-amber-100 tracking-widest uppercase mb-1">Grow Your Business</p>
            <h3 className="text-xl md:text-2xl font-bold text-white">Become a Seller on LinkAndSmile</h3>
            <p className="text-sm text-amber-100 mt-1">Reach thousands of buyers across India</p>
          </div>
          <a
            href="/register-as-seller"
            className="relative z-10 shrink-0 bg-white text-amber-600 font-bold text-sm py-2.5 px-6 rounded-xl hover:bg-amber-50 transition-all duration-150 shadow-md"
          >
            Register Now →
          </a>
        </div>
      </section>

      {/* ── All Products ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 md:pb-14">
        <Section
          title="Shop All Products"
          subtitle="Browse our complete collection from all brands"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {!isClient || loading
              ? [...Array(12)].map((_, i) => <SkeletonCard key={i} />)
              : allProducts.length === 0
              ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-stone-400 text-sm">No products available yet</p>
                </div>
              )
              : allProducts.map((p) => (
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
        </Section>
      </section>

      {/* ── Why Choose Us ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
        <WhyChoose />
      </section>

      {/* ── Floating buttons ──────────────────────── */}
      <div className="fixed left-4 bottom-6 z-50 flex flex-col gap-3 items-center">
        {/* Amazon */}
        <a
          href="https://www.amazon.in/stores/LINKANDSMILE"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Shop on Amazon"
          className="w-12 h-12 rounded-full bg-white shadow-lg border border-stone-200 flex items-center justify-center hover:-translate-y-0.5 hover:shadow-xl transition-all duration-150"
        >
          <img
            src="https://static.vecteezy.com/system/resources/thumbnails/050/816/837/small/amazon-shopping-transparent-icon-free-png.png"
            alt="Amazon"
            className="w-7 h-7 object-contain"
          />
        </a>

        {/* WhatsApp */}
        <div className="relative" ref={waMenuRef}>
          <button
            ref={waButtonRef}
            onClick={() => setWaMenuOpen((s) => !s)}
            type="button"
            aria-haspopup="menu"
            aria-expanded={waMenuOpen}
            aria-label="Open WhatsApp options"
            className="w-12 h-12 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center hover:-translate-y-0.5 hover:shadow-xl transition-all duration-150"
          >
            <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
            </svg>
          </button>

          <div
            role="menu"
            className={`absolute left-0 bottom-14 w-56 rounded-2xl shadow-xl border border-stone-100 bg-white transition-all duration-150 origin-bottom-left ${
              waMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <div className="p-2">
              <button
                role="menuitem"
                onClick={() => openWaFor(PRIMARY_WA)}
                className="w-full text-left px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 rounded-xl flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-xs">Chat with LinkAndSmile</p>
                  <p className="text-xs text-stone-400">{PRIMARY_WA}</p>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => openWaFor(SECONDARY_WA)}
                className="w-full text-left px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 rounded-xl flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M22 12v6a2 2 0 0 1-2 2H6l-4 4V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-xs">Chat with Support</p>
                  <p className="text-xs text-stone-400">{SECONDARY_WA}</p>
                </div>
              </button>

              <div className="border-t border-stone-100 mt-1 pt-1 px-1">
                <a
                  href={buildWaLink(PRIMARY_WA)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-stone-400 hover:text-stone-600 py-2 rounded-xl hover:bg-stone-50 transition-colors"
                >
                  Open in WhatsApp Web
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
        className={`fixed right-5 bottom-6 z-50 w-10 h-10 rounded-full shadow-lg bg-stone-900 hover:bg-stone-800 flex items-center justify-center transition-all duration-200 ${
          showTopButton ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-3"
        }`}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Marquee keyframe */}
      <style jsx global>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </main>
  )
}