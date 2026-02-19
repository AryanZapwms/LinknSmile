"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Edit2, Search, Eye } from "lucide-react"

interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  stock: number
  company: { name: string }
  category: { name: string }
}

export default function ProductsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12 // rows per page

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }
    if (!session) return
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router])

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=1000")
      if (!res.ok) throw new Error("Failed to fetch products")
      const data = await res.json()
      setProducts(data.products || data)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete product")
      await fetchProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
    }
  }

  // Filtered products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.company?.name?.toLowerCase().includes(query) ||
        product.category?.name?.toLowerCase().includes(query)
    )
  }, [products, searchQuery])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage))
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + itemsPerPage)

  useEffect(() => {
    // reset page if filtered results change
    setCurrentPage(1)
  }, [searchQuery])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading products...</p>
      </main>
    )
  }

  if (status === "unauthenticated") return null

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-foreground">Products Management</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link href="/admin/products/add">
              <Button>Add Product</Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, company, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b">
                    <th className="py-3 px-2 w-16">Image</th>
                    <th className="py-3 px-2">Name</th>
                    <th className="py-3 px-2 hidden md:table-cell">Company</th>
                    <th className="py-3 px-2 hidden lg:table-cell">Category</th>
                    <th className="py-3 px-2">Price</th>
                    <th className="py-3 px-2">Stock</th>
                    <th className="py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => (
                      <tr key={product._id} className="border-b hover:bg-muted/40 transition">
                        <td className="py-3 px-2">
                          <div className="w-16 h-12 relative rounded overflow-hidden bg-muted">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={64}
                                height={48}
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                No image
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-2 align-top">
                          <div className="font-semibold line-clamp-2">{product.name}</div>
                          <div className="text-xs text-muted-foreground hidden sm:block">ID: {product._id}</div>
                        </td>

                        <td className="py-3 px-2 hidden md:table-cell align-top">{product.company?.name}</td>

                        <td className="py-3 px-2 hidden lg:table-cell align-top">{product.category?.name}</td>

                        <td className="py-3 px-2 align-top">
                          <div className="font-bold">₹{product.discountPrice || product.price}</div>
                          {product.discountPrice && (
                            <div className="text-xs line-through text-muted-foreground">₹{product.price}</div>
                          )}
                        </td>

                        <td className="py-3 px-2 align-top text-sm text-muted-foreground">{product.stock}</td>

                        <td className="py-3 px-2 align-top">
                          <div className="flex gap-2 flex-wrap">
                            <Link
                              href={`/shop/${product.company?.name?.toLowerCase().replace(/\\s+/g, '-')}/product/${product._id}`}
                              className="flex-1"
                            >
                              <Button size="sm" variant="ghost" className="w-full justify-start">
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            </Link>

                          <Link href={`/admin/products/edit/${product._id}`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full justify-start">
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => deleteProduct(product._id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </td>
                      </tr>
                ))
                  )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {filteredProducts.length > 0 && (
            <div className="flex items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">Showing {startIdx + 1} - {Math.min(startIdx + itemsPerPage, filteredProducts.length)} of {filteredProducts.length}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </main >
  )
}
