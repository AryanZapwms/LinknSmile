"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/product-card"
import { ProductFilters } from "@/components/product-filters"
import { Button } from "@/components/ui/button"

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
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ company: "", priceRange: [0, 10000] as [number, number] })

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/companies")
        const data = await res.json()
        setCompanies(data)
      } catch (error) {
        console.error("Error fetching companies:", error)
      }
    }

    fetchCompanies()
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append("page", page.toString())
        params.append("limit", "12")
        if (filters.company) params.append("company", filters.company)

        const res = await fetch(`/api/products?${params}`)
        const data = await res.json()
        setProducts(data.products)
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [page, filters])

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-foreground">Shop</h1>
          <p className="text-muted-foreground mt-2">Browse our premium skincare collection</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <ProductFilters companies={companies} onFilterChange={setFilters} />
          </div>

          {/* Products Grid */}
          <div className="md:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">No products found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                    Previous
                  </Button>
                  <span className="flex items-center px-4">Page {page}</span>
                  <Button variant="outline" onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
