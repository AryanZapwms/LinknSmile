// "use client"

// import React, { useEffect, useMemo, useState } from "react"
// import { useParams } from "next/navigation"
// import Link from "next/link"
// import { ProductCard } from "@/components/product-card"
// import { BrandFilters } from "@/components/brand-filters"
// import { Button } from "@/components/ui/button"
// import { Home, ChevronRight, Star, Filter } from "lucide-react"
// import { getCachedSync, fetchWithCache } from "@/lib/cacheClient"
// import { ComingSoon } from "@/components/coming-soon"

// interface Product {
//   _id: string
//   name: string
//   price: number
//   discountPrice?: number
//   image: string
//   company: { name: string; slug: string }
// }

// interface Category {
//   _id: string
//   name: string
//   slug: string
//   description?: string
//   parent?: { name: string; slug: string }
//   subCategories?: Category[]
// }

// const TTL = 1000 * 60 * 5
// const MAX_AGE = 1000 * 60 * 60 * 24
// const PRODUCTS_PER_PAGE = 12

// function categoryCacheKey(company: string, category: string) {
//   return `category:${company}:${category}`
// }

// function categoryProductsCacheKey(company: string, category: string, page: number) {
//   return `category:products:${company}:${category}:page:${page}`
// }

// async function fetchCategoryDataAPI(company: string, category: string): Promise<Category | null> {
//   const res = await fetch(`/api/categories?company=${company}`, { cache: "no-store" })
//   if (!res.ok) throw new Error("Failed to fetch categories")
//   const categoriesData = await res.json()
//   for (const mainCat of categoriesData) {
//     if (mainCat.slug === category) return mainCat
//     if (mainCat.subCategories) {
//       const sub = mainCat.subCategories.find((s: Category) => s.slug === category)
//       if (sub) return sub
//     }
//   }
//   return null
// }

// async function fetchCategoryProductsAPI(company: string, category: string, page: number): Promise<Product[]> {
//   const params = new URLSearchParams()
//   params.append("page", page.toString())
//   params.append("limit", PRODUCTS_PER_PAGE.toString())
//   params.append("company", company)
//   params.append("category", category)

//   const res = await fetch(`/api/products?${params}`, { cache: "no-store" })
//   if (!res.ok) throw new Error("Failed to fetch products")
//   const data = await res.json()
//   return Array.isArray(data.products) ? data.products : []
// }

// /* =========================
//    Breadcrumbs - accessible + responsive
//    ========================= */
// function toTitleCase(slug: string) {
//   return slug
//     .replace(/[-_]/g, " ")
//     .split(" ")
//     .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
//     .join(" ")
// }

// function buildBreadcrumbs(company: string, categoryData: Category | null) {
//   const crumbs: { label: string; href: string }[] = []
//   crumbs.push({ label: "Home", href: "/" })
//   crumbs.push({ label: toTitleCase(company), href: `/shop/${company}` })

//   if (categoryData?.parent) {
//     crumbs.push({ label: categoryData.parent.name, href: `/shop/${company}/${categoryData.parent.slug}` })
//   }

//   if (categoryData) {
//     crumbs.push({ label: categoryData.name, href: `/shop/${company}/${categoryData.slug}` })
//   }

//   return crumbs
// }

// function Breadcrumbs({ company, categoryData }: { company: string; categoryData: Category | null }) {
//   const crumbs = useMemo(() => buildBreadcrumbs(company, categoryData), [company, categoryData])
//   const [expanded, setExpanded] = useState(false)

//   // Build JSON-LD for search engines (client component only)
//   const jsonLd = useMemo(() => {
//     return {
//       "@context": "https://schema.org",
//       "@type": "BreadcrumbList",
//       itemListElement: crumbs.map((c, i) => ({
//         "@type": "ListItem",
//         position: i + 1,
//         name: c.label,
//         item: typeof window !== "undefined" ? new URL(c.href, window.location.origin).href : c.href,
//       })),
//     }
//   }, [crumbs])

//   return (
//     <nav aria-label="Breadcrumb" className="text-sm" >
//       <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

//       <ol className="flex items-center gap-2 flex-wrap">
//         {crumbs.map((c, i) => {
//           // collapse middle elements when many crumbs and not expanded
//           const collapseMiddle = crumbs.length > 4 && i > 0 && i < crumbs.length - 2 && !expanded
//           if (collapseMiddle) {
//             return (
//               <li key="ellipsis" className="flex items-center">
//                 <button
//                   onClick={() => setExpanded(true)}
//                   className="px-2 py-1 rounded-md hover:bg-neutral-100/40"
//                   aria-label="Show more breadcrumbs"
//                 >
//                   …
//                 </button>
//                 <ChevronRight size={14} />
//               </li>
//             )
//           }

//           const isLast = i === crumbs.length - 1
//           return (
//             <li key={c.href} className="flex items-center">
//               <span className="sr-only">{i === 0 ? "start" : ""}</span>
//               <Link
//                 href={c.href}
//                 className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${isLast ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
//                 aria-current={isLast ? "page" : undefined}
//               >
//                 {i === 0 ? <Home size={14} /> : null}
//                 <span className="truncate max-w-[10rem]">{c.label}</span>
//               </Link>
//               {!isLast && <ChevronRight size={14} className="mx-1 text-muted-foreground" />}
//             </li>
//           )
//         })}
//       </ol>
//     </nav>
//   )
// }

// export default function CategoryPage() {
//   const params = useParams()
//   const company = params.company as string
//   const category = params.category as string

//   const initialCategoryData = useMemo(
//     () => getCachedSync<Category | null>(categoryCacheKey(company, category), MAX_AGE),
//     [company, category]
//   )
//   const initialProducts = useMemo(
//     () => getCachedSync<Product[]>(categoryProductsCacheKey(company, category, 1), MAX_AGE) ?? [],
//     [company, category]
//   )

//   const [products, setProducts] = useState<Product[]>(initialProducts)
//   const [categoryData, setCategoryData] = useState<Category | null>(initialCategoryData ?? null)
//   const [loading, setLoading] = useState(!initialProducts.length)
//   const [page, setPage] = useState(1)

//   useEffect(() => {
//     let mounted = true

//     async function loadCategory() {
//       try {
//         const cacheKey = categoryCacheKey(company, category)
//         const data = await fetchWithCache<Category | null>(
//           cacheKey,
//           () => fetchCategoryDataAPI(company, category),
//           { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
//         )
//         if (!mounted) return
//         setCategoryData(data)
//       } catch (error) {
//         console.error("Error fetching category:", error)
//       }
//     }

//     loadCategory()
//     return () => {
//       mounted = false
//     }
//   }, [company, category])

//   useEffect(() => {
//     let mounted = true

//     async function loadProducts() {
//       setLoading(true)
//       try {
//         const cacheKey = categoryProductsCacheKey(company, category, page)
//         const data = await fetchWithCache<Product[]>(
//           cacheKey,
//           () => fetchCategoryProductsAPI(company, category, page),
//           { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
//         )
//         if (!mounted) return
//         setProducts(data)
//       } catch (error) {
//         console.error("Error fetching products:", error)
//       } finally {
//         if (!mounted) return
//         setLoading(false)
//       }
//     }

//     loadProducts()
//     return () => {
//       mounted = false
//     }
//   }, [page, company, category])

//   const handleCategoryChange = (categorySlug: string) => {
//     // navigation handled by Link in BrandFilters
//   }

//   return (
//     <main className="min-h-screen bg-background">
//       {/* Enhanced Header */}
//       <div className="border-b border-border">
//         <div className="max-w-7xl mx-auto px-4 py-8">
//           <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
//             <div className="flex-1">
//               {/* Breadcrumb + Title */}
//               <div className="flex flex-col gap-3">
//                 <Breadcrumbs company={company} categoryData={categoryData} />

//                 <div className="flex items-center gap-4">
//                   <h1 className="text-4xl font-extrabold text-foreground leading-tight">
//                     {categoryData?.parent ? `${categoryData.parent.name} › ${categoryData.name}` : categoryData?.name || "Category"}
//                   </h1>

//                   {/* small badge showing product count + featured star */}
//                   <div className="hidden sm:flex items-center gap-2">
//                     <span className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-100/40 text-sm text-muted-foreground">{products.length} products</span>
//                     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-sm"> <Star size={14} /> Popular</span>
//                   </div>
//                 </div>

//                 {/* {categoryData?.description && (
//                   <p className="text-muted-foreground max-w-3xl mt-2">{categoryData.description}</p>
//                 )} */}
//               </div>
//             </div>

//             {/* CTA / Quick filters */}
//             <div className="mt-3 md:mt-0 flex items-center gap-3">
//               <Button variant="ghost" className="hidden sm:inline-flex items-center gap-2">
//                 <Filter size={16} /> Filters
//               </Button>
//               <Link href={`/shop/${company}`}>
//                 <Button variant="outline">View all {toTitleCase(company)}</Button>
//               </Link>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Content */}
//       <div className="max-w-7xl mx-auto px-4 py-8">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
//           <div className="md:col-span-1">
//             <BrandFilters
//               companySlug={company}
//               onCategoryChange={handleCategoryChange}
//               selectedCategory={category}
//             />
//           </div>

//           <div className="md:col-span-3">
//             {loading ? (
//               <div className="flex items-center justify-center h-96">
//                 <p className="text-muted-foreground">Loading products...</p>
//               </div>
//             ) : products.length === 0 ? (
//               <div className="">
//                <ComingSoon companyName={company} />
//               </div>
//             ) : (
//               <>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
//   {products.map((product) => (
//     <ProductCard
//       key={product._id}
//       id={product._id}
//       name={product.name}
//       price={product.price}
//       discountPrice={product.discountPrice}
//       image={product.image}
//       company={product.company}
//     />
//   ))}
// </div>


//                 <div className="flex justify-center gap-2">
//                   <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
//                     Previous
//                   </Button>
//                   <span className="flex items-center px-4">Page {page}</span>
//                   <Button variant="outline" onClick={() => setPage(page + 1)}>
//                     Next
//                   </Button>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </main>
//   )
// }





"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ProductCard } from "@/components/product-card"
import { BrandFilters } from "@/components/brand-filters"
import { Button } from "@/components/ui/button"
import { Home, ChevronRight, Star, Filter } from "lucide-react"
import { getCachedSync, fetchWithCache } from "@/lib/cacheClient"
import { ComingSoon } from "@/components/coming-soon"

interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company: { name: string; slug: string }
}

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  parent?: { name: string; slug: string }
  subCategories?: Category[]
}

const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24
const PRODUCTS_PER_PAGE = 12

function categoryCacheKey(company: string, category: string) {
  return `category:${company}:${category}`
}

function categoryProductsCacheKey(company: string, category: string, page: number) {
  return `category:products:${company}:${category}:page:${page}`
}

async function fetchCategoryDataAPI(company: string, category: string): Promise<Category | null> {
  const res = await fetch(`/api/categories?company=${company}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch categories")
  const categoriesData = await res.json()
  for (const mainCat of categoriesData) {
    if (mainCat.slug === category) return mainCat
    if (mainCat.subCategories) {
      const sub = mainCat.subCategories.find((s: Category) => s.slug === category)
      if (sub) return sub
    }
  }
  return null
}

async function fetchCategoryProductsAPI(company: string, category: string, page: number): Promise<Product[]> {
  const params = new URLSearchParams()
  params.append("page", page.toString())
  params.append("limit", PRODUCTS_PER_PAGE.toString())
  params.append("company", company)
  params.append("category", category)

  const res = await fetch(`/api/products?${params}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch products")
  const data = await res.json()
  return Array.isArray(data.products) ? data.products : []
}

/* =========================
   Breadcrumbs - accessible + responsive
   ========================= */
function toTitleCase(slug: string) {
  return slug
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

function buildBreadcrumbs(company: string, categoryData: Category | null) {
  const crumbs: { label: string; href: string }[] = []
  crumbs.push({ label: "Home", href: "/" })
  crumbs.push({ label: toTitleCase(company), href: `/shop/${company}` })

  if (categoryData?.parent) {
    crumbs.push({ label: categoryData.parent.name, href: `/shop/${company}/${categoryData.parent.slug}` })
  }

  if (categoryData) {
    crumbs.push({ label: categoryData.name, href: `/shop/${company}/${categoryData.slug}` })
  }

  return crumbs
}

function Breadcrumbs({ company, categoryData }: { company: string; categoryData: Category | null }) {
  const crumbs = useMemo(() => buildBreadcrumbs(company, categoryData), [company, categoryData])
  const [expanded, setExpanded] = useState(false)

  // Build JSON-LD for search engines (client component only)
  const jsonLd = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        item: typeof window !== "undefined" ? new URL(c.href, window.location.origin).href : c.href,
      })),
    }
  }, [crumbs])

  return (
    <nav aria-label="Breadcrumb" className="text-sm" >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ol className="flex items-center gap-2 flex-wrap">
        {crumbs.map((c, i) => {
          // collapse middle elements when many crumbs and not expanded
          const collapseMiddle = crumbs.length > 4 && i > 0 && i < crumbs.length - 2 && !expanded
          if (collapseMiddle) {
            return (
              <li key="ellipsis" className="flex items-center">
                <button
                  onClick={() => setExpanded(true)}
                  className="px-2 py-1 rounded-md hover:bg-neutral-100/40"
                  aria-label="Show more breadcrumbs"
                >
                  …
                </button>
                <ChevronRight size={14} />
              </li>
            )
          }

          const isLast = i === crumbs.length - 1
          return (
            <li key={c.href} className="flex items-center">
              <span className="sr-only">{i === 0 ? "start" : ""}</span>
              <Link
                href={c.href}
                className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${isLast ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                aria-current={isLast ? "page" : undefined}
              >
                {i === 0 ? <Home size={14} /> : null}
                <span className="truncate max-w-[10rem]">{c.label}</span>
              </Link>
              {!isLast && <ChevronRight size={14} className="mx-1 text-muted-foreground" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default function CategoryPage() {
  const params = useParams()
  const company = params.company as string
  const category = params.category as string

  const initialCategoryData = useMemo(
    () => getCachedSync<Category | null>(categoryCacheKey(company, category), MAX_AGE),
    [company, category]
  )
  const initialProducts = useMemo(
    () => getCachedSync<Product[]>(categoryProductsCacheKey(company, category, 1), MAX_AGE) ?? [],
    [company, category]
  )

  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categoryData, setCategoryData] = useState<Category | null>(initialCategoryData ?? null)
  const [loading, setLoading] = useState(!initialProducts.length)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadCategory() {
      try {
        const cacheKey = categoryCacheKey(company, category)
        const data = await fetchWithCache<Category | null>(
          cacheKey,
          () => fetchCategoryDataAPI(company, category),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        setCategoryData(data)
      } catch (error) {
        console.error("Error fetching category:", error)
      }
    }

    loadCategory()
    return () => {
      mounted = false
    }
  }, [company, category])

  useEffect(() => {
    let mounted = true

    async function loadProducts() {
      setLoading(true)
      try {
        const currentKey = categoryProductsCacheKey(company, category, page)
        const nextKey = categoryProductsCacheKey(company, category, page + 1)

        // fetch current page and next page in parallel to determine whether "Next" should be enabled
        const currentPromise = fetchWithCache<Product[]>(
          currentKey,
          () => fetchCategoryProductsAPI(company, category, page),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        ).catch((err) => {
          console.error("Error fetching current page:", err)
          return [] as Product[]
        })

        const nextPromise = fetchWithCache<Product[]>(
          nextKey,
          () => fetchCategoryProductsAPI(company, category, page + 1),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        ).catch((err) => {
          // next page missing or request failed -> treat as empty
          return [] as Product[]
        })

        const [data, nextData] = await Promise.all([currentPromise, nextPromise])

        if (!mounted) return

        // If current page returned zero items and we're not on page 1, step back to previous page
        if (data.length === 0 && page > 1) {
          setPage((p) => Math.max(1, p - 1))
          return
        }

        setProducts(data)
        // if nextData has any items, there's a next page
        setHasNext(Array.isArray(nextData) && nextData.length > 0)
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    loadProducts()
    return () => {
      mounted = false
    }
  }, [page, company, category])

  const handleCategoryChange = (categorySlug: string) => {
    // navigation handled by Link in BrandFilters
  }

  // Show pagination controls only when there's more than one page (either we're on a page > 1 OR there's a next page)
  const showPagination = products.length > 0 && (page > 1 || hasNext)

  return (
    <main className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              {/* Breadcrumb + Title */}
              <div className="flex flex-col gap-3">
                <Breadcrumbs company={company} categoryData={categoryData} />

                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-extrabold text-foreground leading-tight">
                    {categoryData?.parent ? `${categoryData.parent.name} › ${categoryData.name}` : categoryData?.name || "Category"}
                  </h1>

                  {/* small badge showing product count + featured star */}
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-100/40 text-sm text-muted-foreground">{products.length} products</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-sm"> <Star size={14} /> Popular</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA / Quick filters */}
            <div className="mt-3 md:mt-0 flex items-center gap-3">
              <Button variant="ghost" className="hidden sm:inline-flex items-center gap-2">
                <Filter size={16} /> Filters
              </Button>
              <Link href={`/shop/${company}`}>
                <Button variant="outline">View all {toTitleCase(company)}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <BrandFilters
              companySlug={company}
              onCategoryChange={handleCategoryChange}
              selectedCategory={category}
            />
          </div>

          <div className="md:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="">
               <ComingSoon companyName={company} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                  {products.map((product) => (
                    <ProductCard
                      key={product._id}
                      id={product._id}
                      name={product.name}
                      price={product.price}
                      discountPrice={product.discountPrice}
                      image={product.image}
                      company={{ _id: "dummy", name: products[0].company.name, slug: products[0].company.slug }}
                    />
                  ))}
                </div>

                {showPagination && (
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                    </Button>
                    <span className="flex items-center px-4">Page {page}</span>
                    <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!hasNext}>
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
