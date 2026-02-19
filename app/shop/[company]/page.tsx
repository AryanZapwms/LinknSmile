"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { ProductCard } from "@/components/product-card"
import { BrandFilters } from "@/components/brand-filters"
import { CompanyCarousel } from "@/components/company-carousel"
import { NewArrivals } from "@/components/new-arrivals"
import { Button } from "@/components/ui/button"
import { ShopByConcern } from "@/components/shop-by-concern"
import WhyChoose from "@/components/why-choose"
import Testimonials from "@/components/testimonials"
import { ComingSoon } from "@/components/coming-soon"
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"

interface CarouselImage {
  _id: string
  url: string
  title?: string
  description?: string
}

interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company: { name: string; slug: string }
}

interface Company {
  _id: string
  name: string
  slug: string
  description?: string
  banner?: string
  carouselImages?: CarouselImage[]
}

const PRODUCTS_PER_PAGE = 12

/* =========================
   Cache configuration
   ========================= */
const COMPANIES_KEY = "shop:companies:all"
const TTL = 1000 * 60 * 5 // 5 minutes: stale-after
const MAX_AGE = 1000 * 60 * 60 * 24 // 24 hours: eviction

function productCacheKey(opts: { company?: string; page: number; limit: number; category?: string }) {
  const { company = "all", page, limit, category = "" } = opts
  return `shop:products:company:${company}:page:${page}:limit:${limit}:cat:${category}`
}

/* =========================
   API Fetchers
   ========================= */

async function fetchCompaniesAPI(): Promise<Company[]> {
  const res = await fetch("/api/companies", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch companies")
  const json = await res.json()
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.data)) return json.data
  return []
}

async function fetchProductsAPI(params: {
  page: number
  limit: number
  company?: string
  category?: string
}): Promise<{ products: Product[]; total: number }> {
  const { page, limit, company, category } = params
  const urlParams = new URLSearchParams()
  urlParams.append("page", String(page))
  urlParams.append("limit", String(limit))
  if (company) urlParams.append("company", company)
  if (category) urlParams.append("category", category)

  const res = await fetch(`/api/products?${urlParams.toString()}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch products")
  const json = await res.json()
  
  const products = Array.isArray(json?.products)
    ? json.products
    : Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
    ? json.data
    : []
  const total = typeof json?.total === "number" ? json.total : (json?.totalItems ?? json?.count ?? products.length)
  return { products, total: Number(total ?? products.length) }
}

/**
 * Public helper to invalidate caches used by this page
 */
export function invalidateCompanyShopCaches(companySlug?: string) {
  invalidateCache(COMPANIES_KEY)
  if (companySlug) {
    invalidateCache(`shop:products:company:${companySlug}:`)
  } else {
    invalidateCache("shop:products:company:")
  }
}

/* =========================
   Component
   ========================= */

export default function CompanyShopPage() {
  const params = useParams()
  const companySlug = params.company as string
  
  // Instant render from cache (sync)
  const initialCompanies = useMemo(() => getCachedSync<Company[]>(COMPANIES_KEY, MAX_AGE) ?? [], [])
  
  const [products, setProducts] = useState<Product[]>([])
  const [companyData, setCompanyData] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState("")

  // Fetch company metadata from cached companies list
  useEffect(() => {
    let mounted = true
    
    async function loadCompany() {
      if (!companySlug) return
      try {
        const companies = await fetchWithCache<Company[]>(
          COMPANIES_KEY,
          fetchCompaniesAPI,
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        const found = Array.isArray(companies) ? companies.find((c: Company) => c.slug === companySlug) : null
        if (found) setCompanyData(found)
        else setCompanyData(null)
      } catch (err) {
        console.error("Error fetching company:", err)
        if (!mounted) return
        setCompanyData(null)
      }
    }
    
    loadCompany()
    return () => {
      mounted = false
    }
  }, [companySlug])

  // Fetch products (cached, paginated)
  useEffect(() => {
    let mounted = true
    
    async function loadProducts() {
      if (!companySlug) return
      setLoading(true)
      try {
        const productOpts = {
          company: companySlug,
          page,
          limit: PRODUCTS_PER_PAGE,
          category: selectedCategory || undefined,
        }
        const cacheKey = productCacheKey(productOpts)
        
        const { products: fetched, total } = await fetchWithCache<{ products: Product[]; total: number }>(
          cacheKey,
          () => fetchProductsAPI(productOpts),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        setProducts(fetched)
        setTotalPages(Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)))
      } catch (err) {
        console.error("Error fetching products:", err)
        if (!mounted) return
        setProducts([])
        setTotalPages(1)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    loadProducts()
    return () => {
      mounted = false
    }
  }, [companySlug, page, selectedCategory])

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug)
    setPage(1)
  }

  // Wait for company data to load first (existing skeleton)
  if (!companyData) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-4">
                <div className="w-48 h-96 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="lg:col-span-1 space-y-8">
              <div className="w-full h-[300px] md:h-[400px] bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Check if carousel exists (only after companyData is loaded)
  const hasCarousel = companyData.carouselImages && companyData.carouselImages.length > 0

  // If no carousel, show Coming Soon banner only
  if (!hasCarousel) {
    return <ComingSoon companyName={companyData.name} />
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-4">
              <BrandFilters
                companySlug={companySlug}
                onCategoryChange={handleCategoryChange}
                selectedCategory={selectedCategory}
              />
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-1 space-y-8">
            {/* Carousel */}
            {hasCarousel ? (
              <CompanyCarousel images={companyData.carouselImages} />
            ) : (
              <div className="w-full h-[300px] md:h-[400px] bg-muted animate-pulse rounded-lg" />
            )}

            {/* Mobile/Tablet Filter Button - Shows below carousel */}
            <div className="lg:hidden">
              <BrandFilters
                companySlug={companySlug}
                onCategoryChange={handleCategoryChange}
                selectedCategory={selectedCategory}
              />
            </div>

            {/* New Arrivals */}
            {companyData ? (
              <NewArrivals
                companyId={companyData._id}
                companySlug={companySlug}
                companyName={companyData.name}
              />
            ) : (
              <div>
                <div className="w-48 h-8 bg-muted animate-pulse rounded mx-auto mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-lg h-80 w-full" />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Products */}
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                  We Suggest Our Products
                </h2>
              </div>

              <div>
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                    {[...Array(PRODUCTS_PER_PAGE)].map((_, i) => (
                      <div key={i} className="bg-muted animate-pulse rounded-lg h-80 w-full" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                      <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No products found</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                      We couldn't find any products matching your criteria. Try adjusting your filters.
                    </p>
                    {selectedCategory && (
                      <Button variant="outline" onClick={() => { setSelectedCategory(""); setPage(1); }}>
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5  p-8 rounded-md overflow-hidden " style={{backgroundColor:'#FAF6E8'}}>
                      {products.map((product) => (
                        <ProductCard
                          key={product._id}
                          id={product._id}
                          name={product.name}
                          price={product.price}
                          discountPrice={product.discountPrice}
                          image={product.image}
                          company={product.company}
                        />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-8 pt-6 border-t">
                        <div className="flex justify-center items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="h-9 px-4"
                          >
                            Previous
                          </Button>
                          <div className="hidden sm:flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum
                              if (totalPages <= 5) pageNum = i + 1
                              else if (page <= 3) pageNum = i + 1
                              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                              else pageNum = page - 2 + i
                              return pageNum
                            }).map((pageNum) => (
                              <Button
                                key={pageNum}
                                variant={page === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPage(pageNum)}
                                className="w-9 h-9"
                              >
                                {pageNum}
                              </Button>
                            ))}
                          </div>
                          <div className="sm:hidden text-sm font-medium text-foreground px-3">
                            {page} / {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="h-9 px-4"
                          >
                            Next
                          </Button>
                        </div>
                        <div className="text-center mt-3 text-xs text-muted-foreground">
                          Showing {(page - 1) * PRODUCTS_PER_PAGE + 1}-{Math.min(page * PRODUCTS_PER_PAGE, totalPages * PRODUCTS_PER_PAGE)} of {totalPages * PRODUCTS_PER_PAGE} products
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Shop By Concern */}
            {companyData ? (
              <div>
                <ShopByConcern
                  companyId={companyData._id}
                  companySlug={companyData.slug}
                />
              </div>
            ) : (
              <div>
                <div className="w-48 h-8 bg-muted animate-pulse rounded mx-auto mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square bg-muted animate-pulse rounded-full" />
                  ))}
                </div>
              </div>
            )}

            {/* Why Choose Instapeels */}
            <WhyChoose />

            {/* Testimonials */}
            <Testimonials companySlug={companySlug} />


          </div>
        </div>
      </div>
    </main>
  )
}
