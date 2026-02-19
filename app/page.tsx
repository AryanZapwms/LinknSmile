  "use client"

  import { useEffect, useState, useMemo, useRef } from "react"
  import { ProductCard } from "@/components/product-card"
  import { HomeCarousel } from "@/components/home-carousel"
  import { ShopByConcern } from "@/components/shop-by-concern"
  import WhyChoose from "@/components/why-choose"
  import Testimonials from "@/components/testimonials"
  import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"

  interface Product {
    _id: string
    name: string
    price: number
    discountPrice?: number
    image: string
    company: { _id: string; name: string; slug: string }
  }

  interface Company {
    _id: string
    name: string
    slug: string
    carouselImages?: Array<{ _id: string; url: string; title?: string; description?: string }>
  }

  interface Review {
    id: string
    productName: string
    productImage: string
    productId: string
    customerName: string
    rating: number
    comment: string
    company: string
  }

  /* =========================
    Cache configuration
    ========================= */
  const COMPANIES_KEY = "home:companies:all"
  const SUGGESTED_PRODUCTS_KEY = "home:products:suggested:8"
  const ALL_PRODUCTS_KEY = "home:products:all:100"
  const REVIEWS_KEY = "home:reviews:all"

  const TTL = 1000 * 60 * 5 // 5 minutes: stale-after
  const MAX_AGE = 1000 * 60 * 60 * 24 // 24 hours: eviction threshold

  /* =========================
    API fetchers
    ========================= */

  async function fetchCompaniesAPI(): Promise<Company[]> {
    const res = await fetch("/api/companies", { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to fetch companies")
    const json = await res.json()
    if (Array.isArray(json)) return json
    if (Array.isArray(json?.data)) return json.data
    return []
  }

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
      company: r.company || r.brand || "Instapeels",
    }))
  }

  /* =========================
    Public cache invalidation
    ========================= */
  export function invalidateHomeCaches() {
    invalidateCache(COMPANIES_KEY)
    invalidateCache(SUGGESTED_PRODUCTS_KEY)
    invalidateCache(ALL_PRODUCTS_KEY)
    invalidateCache(REVIEWS_KEY)
  }

  /* =========================
    Home component (uses caches)
    ========================= */

  export default function Home() {
    // Only read sync cache on client — avoid running getCachedSync during SSR
    const initialCompanies = useMemo(
      () => (typeof window === "undefined" ? [] : getCachedSync<Company[]>(COMPANIES_KEY, MAX_AGE) ?? []),
      []
    )
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

    // State
    const [suggestedProducts, setSuggestedProducts] = useState<Product[]>(initialSuggestedProducts)
    const [allProducts, setAllProducts] = useState<Product[]>(initialAllProducts)
    const [companies, setCompanies] = useState<Company[]>(initialCompanies)
    const [loading, setLoading] = useState(initialAllProducts.length === 0)
    const [selectedConcernCompany, setSelectedConcernCompany] = useState<Company | null>(null)
    const [reviews, setReviews] = useState<Review[]>(initialReviews)
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
    const [showTopButton, setShowTopButton] = useState(false)

    // WhatsApp menu state
    const [waMenuOpen, setWaMenuOpen] = useState(false)
    const waMenuRef = useRef<HTMLDivElement | null>(null)
    const waButtonRef = useRef<HTMLButtonElement | null>(null)

    // Client mount guard to ensure SSR and first client render match
    const [isClient, setIsClient] = useState(false)
    useEffect(() => {
      setIsClient(true)
    }, [])

    // Dummy reviews data (fallback)
    const dummyReviews: Review[] = [
      {
        id: "1",
        productName: "Product Name",
        productImage: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=500&fit=crop",
        productId: "",
        customerName: "mihir",
        rating: 5,
        comment: "afgbaerbh",
        company: "Instapeels",
      },
    ]

    // Fetch companies
    useEffect(() => {
      let mounted = true
      const loadCompanies = async () => {
        try {
          const data = await fetchWithCache<Company[]>(
            COMPANIES_KEY,
            fetchCompaniesAPI,
            { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
          )
          if (!mounted) return
          setCompanies(data)
          if (data.length > 0) {
            const instaapeelsCompany = data.find((company: Company) =>
              company.name.toLowerCase() === "instapeels" || company.slug === "instapeels"
            )
            setSelectedConcernCompany(instaapeelsCompany || data[0])
          } else {
            setSelectedConcernCompany(null)
          }
        } catch (err) {
          console.error("Error fetching companies:", err)
        }
      }
      loadCompanies()
      return () => {
        mounted = false
      }
    }, [])

    // Fetch suggested products
    useEffect(() => {
      let mounted = true
      const loadSuggested = async () => {
        try {
          const data = await fetchWithCache<Product[]>(
            SUGGESTED_PRODUCTS_KEY,
            fetchSuggestedProductsAPI,
            { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
          )
          if (!mounted) return
          // Sort to show Instapeels products first
          data.sort((a, b) => {
            const aIsInstapeels = a.company.name.toLowerCase() === 'instapeels'
            const bIsInstapeels = b.company.name.toLowerCase() === 'instapeels'
            if (aIsInstapeels && !bIsInstapeels) return -1
            if (!aIsInstapeels && bIsInstapeels) return 1
            return 0
          })
          setSuggestedProducts(data)
        } catch (err) {
          console.error("Error fetching suggested products:", err)
        }
      }
      loadSuggested()
      return () => {
        mounted = false
      }
    }, [])

    // Fetch all products
    useEffect(() => {
      let mounted = true
      const loadAllProducts = async () => {
        setLoading(true)
        try {
          const data = await fetchWithCache<Product[]>(
            ALL_PRODUCTS_KEY,
            fetchAllProductsAPI,
            { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
          )
          if (!mounted) return
          // Sort to show Instapeels products first
          data.sort((a, b) => {
            const aIsInstapeels = a.company.name.toLowerCase() === 'instapeels'
            const bIsInstapeels = b.company.name.toLowerCase() === 'instapeels'
            if (aIsInstapeels && !bIsInstapeels) return -1
            if (!aIsInstapeels && bIsInstapeels) return 1
            return 0
          })
          setAllProducts(data)
        } catch (err) {
          console.error("Error fetching all products:", err)
        } finally {
          if (!mounted) return
          setLoading(false)
        }
      }
      loadAllProducts()
      return () => {
        mounted = false
      }
    }, [])

    // Fetch reviews
    useEffect(() => {
      let mounted = true
      const loadReviews = async () => {
        try {
          const data = await fetchWithCache<Review[]>(
            REVIEWS_KEY,
            fetchReviewsAPI,
            { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
          )
          if (!mounted) return
          if (Array.isArray(data) && data.length > 0) setReviews(data)
          else setReviews(dummyReviews)
        } catch (err) {
          console.error("Error fetching reviews:", err)
          setReviews(dummyReviews)
        }
      }
      loadReviews()
      return () => {
        mounted = false
      }
    }, [])

    // Rotate reviews
    useEffect(() => {
      if (reviews.length === 0) return
      const interval = setInterval(() => {
        setCurrentReviewIndex((prev) => (prev + 1) % reviews.length)
      }, 5000)
      return () => clearInterval(interval)
    }, [reviews])

    const currentReview = reviews[currentReviewIndex]

    // Show top button when user scrolls down
    useEffect(() => {
      const onScroll = () => {
        setShowTopButton(window.scrollY > 300)
      }
      onScroll()
      window.addEventListener("scroll", onScroll, { passive: true })
      return () => window.removeEventListener("scroll", onScroll)
    }, [])

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }

    // WhatsApp numbers
    const PRIMARY_WA = "9321179079"
    const SECONDARY_WA = "9819079079"

    // Build wa.me link (no message by default, but easy to add)
    const buildWaLink = (number: string, message?: string) => {
      const base = `https://wa.me/${number}`
      if (!message) return base
      return `${base}?text=${encodeURIComponent(message)}`
    }

    // WhatsApp menu behavior: close on outside click or ESC
    useEffect(() => {
      const onDocClick = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node
        if (!waMenuRef.current) return
        if (waButtonRef.current && waButtonRef.current.contains(target)) return
        if (!waMenuRef.current.contains(target)) {
          setWaMenuOpen(false)
        }
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setWaMenuOpen(false)
      }
      document.addEventListener("mousedown", onDocClick)
      document.addEventListener("touchstart", onDocClick)
      document.addEventListener("keydown", onKey)
      return () => {
        document.removeEventListener("mousedown", onDocClick)
        document.removeEventListener("touchstart", onDocClick)
        document.removeEventListener("keydown", onKey)
      }
    }, [])

    const openWaFor = (number: string) => {
      const url = buildWaLink(number)
      window.open(url, "_blank", "noopener,noreferrer")
      setWaMenuOpen(false)
    }

    return (
      <main className="min-h-screen bg-white relative">
        {/* Carousel Section */}
        <section className="max-w-7xl mx-auto">
          <HomeCarousel />
        </section>

        {/* Our Suggested Products */}
        <section className="max-w-7xl mx-auto px-4 border-purple-200 py-8 bg-white md:py-12">
          <div className="border border-purple-200 rounded-2xl p-6 md:p-10">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Our Suggested Products</h2>
              <p className="text-gray-600">Handpicked products from all our partners</p>
            </div>

            {/* Always render the grid wrapper so DOM shape doesn't change during hydration */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {/* Show skeletons on SSR / before client mount, or when no suggested products */}
              {!isClient || suggestedProducts.length === 0 ? (
                // show 4 skeleton cards (matches expected grid layout)
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-80" />
                  ))}
                </>
              ) : (
                suggestedProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    id={product._id}
                    name={product.name}
                    price={product.price}
                    discountPrice={product.discountPrice}
                    image={product.image}
                    company={product.company}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Shop By Concern Section */}
        {selectedConcernCompany && (
          <section className="bg-purple-50">
            <ShopByConcern companyId={selectedConcernCompany._id} companySlug={selectedConcernCompany.slug} />
          </section>
        )}

        {/* Shop Section - All Products */}
        <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="border border-purple-200 rounded-2xl p-6 md:p-10">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Shop All Products</h2>
              <p className="text-gray-600">Browse our complete collection from all brands</p>
            </div>

            {/* Always render the grid wrapper to keep the DOM stable */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {/* Loading skeletons (SSR and before client mount) */}
              {!isClient || loading ? (
                <>
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-80" />
                  ))}
                </>
              ) : allProducts.length === 0 ? (
                // If client-mounted and no products, show a full-span message
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-600">No products available</p>
                </div>
              ) : (
                allProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    id={product._id}
                    name={product.name}
                    price={product.price}
                    discountPrice={product.discountPrice}
                    image={product.image}
                    company={product.company}
                    size="sm"
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <WhyChoose />
        </section>

        {/* Reviews Section */}
        <div>
          <Testimonials companySlug="default"/>
        </div>

        {/* Floating Buttons */}
        <div className=" fixed left-4 bottom-6 transform -translate-y-1/2 z-50" style={{ WebkitTapHighlightColor: "transparent" }}>


        {/* Amazon button */}
        <div className="fixed bottom-20 z-50">
          <a
            href="https://www.amazon.in/stores/LINKANDSMILE"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Shop on Amazon"
            title="Shop on Amazon"
            className="group inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-transform transform hover:-translate-y-1 hover:scale-105"
          >
            <img
              src="https://static.vecteezy.com/system/resources/thumbnails/050/816/837/small/amazon-shopping-transparent-icon-free-png.png"
              alt="Amazon"
              className="w-8 h-8 object-contain"
            />
          </a>
        </div>  
          {/* WhatsApp button + menu */}
          <div className="relative" ref={waMenuRef}>
            <button
              ref={waButtonRef}
              onClick={() => setWaMenuOpen((s) => !s)}
              type="button"
              aria-haspopup="menu"
              aria-expanded={waMenuOpen}
              aria-label="Open WhatsApp options"
              title="Chat on WhatsApp"
              className="group inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:-translate-y-1 hover:scale-105"
            >
              <svg aria-hidden="true" focusable="false" data-prefix="fab" data-icon="whatsapp" className="w-7 h-7 text-[#25D366]" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="none">
                <path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
              </svg>
            </button>

            {/* Menu */}
            <div
              role="menu"
              aria-label="WhatsApp options"
              className={`absolute left-0 bottom-16 z-50 w-56 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white transition-all transform origin-bottom-left ${waMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
            >
              <div className="py-2">
                <button
                  role="menuitem"
                  onClick={() => openWaFor(PRIMARY_WA)}
                  className="cursor-pointer w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="flex-1">Chat with LinkAndSmile</span>
                  <span className="text-xs text-muted-foreground">{PRIMARY_WA}</span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => openWaFor(SECONDARY_WA)}
                  className="cursor-pointer w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#1A73E8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M22 12v6a2 2 0 0 1-2 2H6l-4 4V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="flex-1">Chat with Support</span>
                  <span className="text-xs text-muted-foreground">{SECONDARY_WA}</span>
                </button>

                <div className="border-t mt-2 pt-2 px-3">
                  <a
                    href={buildWaLink(PRIMARY_WA)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className=" cursor-pointer block w-full text-center text-xs py-2 text-gray-500 hover:text-gray-700"
                  >
                    Open in WhatsApp Web
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={scrollToTop}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              scrollToTop()
            }
          }}
          aria-label="Scroll to top"
          title="Back to top"
          className={`cursor-pointer fixed right-6 bottom-10 z-50 inline-flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400 ${showTopButton ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-4"} bg-purple-600 hover:bg-purple-700`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </main>
    )
  }
