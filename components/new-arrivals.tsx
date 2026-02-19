"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"

interface NewArrivalProduct {
  _id: string
  productId: {
    _id: string
    name: string
    price: number
    discountPrice?: number
  }
  title: string
  image: string
  description?: string
  company: {
    _id: string
    name: string
    slug: string
  }
}

interface NewArrivalsProps {
  companyId: string
  companySlug: string
  companyName: string
}

/* =========================
   Cache configuration
   ========================= */
const TTL = 1000 * 60 * 5 // 5 minutes: stale-after
const MAX_AGE = 1000 * 60 * 60 * 24 // 24 hours: eviction

function getCacheKey(companyId: string) {
  return `newArrivals:${companyId}`
}

/* =========================
   API Fetcher
   ========================= */

async function fetchNewArrivalsAPI(companyId: string): Promise<{ newArrivals: any[]; settings?: any }> {
  const res = await fetch(`/api/companies/${companyId}/new-arrivals`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch new arrivals for ${companyId}`)
  const json = await res.json()
  return {
    newArrivals: Array.isArray(json?.newArrivals)
      ? json.newArrivals
      : Array.isArray(json)
      ? json
      : json?.data ?? [],
    settings: json?.settings ?? {},
  }
}

/**
 * Public helper: invalidate cache for one company or all if no id provided.
 * Call from order creation/stock update code to ensure users see fresh new-arrivals.
 */
export function invalidateNewArrivalsCache(companyId?: string) {
  if (companyId) {
    invalidateCache(getCacheKey(companyId))
  } else {
    invalidateCache("newArrivals:")
  }
}

/* =========================
   Component
   ========================= */

export function NewArrivals({ companyId, companySlug, companyName }: NewArrivalsProps) {
  const router = useRouter()
  
  // Instant render from cache (sync)
  const cacheKey = getCacheKey(companyId)
  const initialData = useMemo(() => getCachedSync<{ newArrivals: any[]; settings?: any }>(cacheKey, MAX_AGE), [cacheKey])
  
  const [products, setProducts] = useState<NewArrivalProduct[]>([])
  const [isVisible, setIsVisible] = useState(initialData?.settings?.isVisible ?? true)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!companyId) {
        setProducts([])
        setIsVisible(false)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await fetchWithCache<{ newArrivals: any[]; settings?: any }>(
          cacheKey,
          () => fetchNewArrivalsAPI(companyId),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return

        // Determine visibility from settings if provided
        setIsVisible(data?.settings?.isVisible ?? true)

        if (Array.isArray(data.newArrivals) && data.newArrivals.length > 0) {
          const arrivals: NewArrivalProduct[] = data.newArrivals
            .map((arrival: any) => {
              const product = arrival.productId || arrival.product
              if (!product) return null
              return {
                _id: arrival._id || arrival.id || `${companyId}-${product._id}`,
                productId: {
                  _id: product._id || product.id,
                  name: product.name || product.title || "Product",
                  price: product.price ?? 0,
                  discountPrice: product.discountPrice,
                },
                title: arrival.title || product.name || product.title || "New Arrival",
                image: arrival.image || product.image || product.imageUrl || "/companylogo.jpg",
                description: arrival.description || product.description || "",
                company: {
                  _id: companyId,
                  name: companyName,
                  slug: companySlug,
                },
              }
            })
            .filter((p: any) => p !== null)
          setProducts(arrivals as NewArrivalProduct[])
        } else {
          setProducts([])
        }
      } catch (err) {
        console.error("Error fetching new arrivals:", err)
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load new arrivals")
        setProducts([])
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [companyId, companySlug, companyName, cacheKey])

  if (!isVisible || products.length === 0) return null
  if (error) return null

  return (
    <Card className="border-0 shadow-none bg-transparent">
      {/* Section Header */}
      <CardHeader className="flex justify-center mb-2">
        <CardTitle className="text-center text-2xl font-semibold">New Arrivals</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Outer Beige Container */}
        <div
          className="rounded-xl p-6 md:p-8"
          style={{ backgroundColor: "#FAF5E8", border: "1px solid #FAF5E8" }}
        >
          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {products.map((product) => (
              <div
                key={product._id}
                className="flex flex-col bg-white rounded-md overflow-hidden text-center shadow-sm"
              >
                {/* Product Image */}
                <div className="w-full h-[260px] overflow-hidden">
                  <img
                    src={product.image || "/companylogo.jpg"}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Text Section */}
                <div className="flex flex-col items-center justify-between p-4" style={{ backgroundColor: "#FAF5E8" }}>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 leading-snug mb-1">
                    {product.title}
                  </h3>

                  <Button
                    onClick={() =>
                      router.push(`/shop/${product.company.slug}/product/${product.productId._id}`)
                    }
                    className="bg-[#F36B9B] hover:bg-[#d85d88] text-white text-sm px-6 py-2 rounded-md font-semibold transition-transform duration-200 hover:scale-105"
                  >
                    Shop now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
