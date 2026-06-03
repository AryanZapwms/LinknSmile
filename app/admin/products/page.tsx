"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Search, Eye } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  stock: number;
  shopId?: { shopName: string };
  category: { name: string };
}

export default function ProductsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // rows per page

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }
    if (!session) return;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=1000");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products || data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      await fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.shopId?.shopName.toLowerCase().includes(query) ||
        product.category?.name?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + itemsPerPage);

  useEffect(() => {
    // reset page if filtered results change
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (status === "loading" || loading) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading products...</p>
      </main>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <h1 className="text-foreground text-3xl font-bold">Products Management</h1>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link href="/admin/products/add">
              <Button>Add Product</Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input
              placeholder="Search products by name, vendor, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-muted-foreground text-sm">
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
                  <tr className="text-muted-foreground border-b text-left text-sm">
                    <th className="w-16 px-2 py-3">Image</th>
                    <th className="px-2 py-3">Name</th>
                    <th className="hidden px-2 py-3 md:table-cell">Vendor</th>
                    <th className="hidden px-2 py-3 lg:table-cell">Category</th>
                    <th className="px-2 py-3">Price</th>
                    <th className="px-2 py-3">Stock</th>
                    <th className="px-2 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted-foreground py-8 text-center">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => (
                      <tr key={product._id} className="hover:bg-muted/40 border-b transition">
                        <td className="px-2 py-3">
                          <div className="bg-muted relative h-12 w-16 overflow-hidden rounded">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={64}
                                height={48}
                                className="object-cover"
                              />
                            ) : (
                              <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
                                No image
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-3 align-top">
                          <div className="line-clamp-2 font-semibold">{product.name}</div>
                          <div className="text-muted-foreground hidden text-xs sm:block">
                            ID: {product._id}
                          </div>
                        </td>

                        <td className="hidden px-2 py-3 align-top md:table-cell">
                          {product.shopId?.shopName || "Unknown"}
                        </td>

                        <td className="hidden px-2 py-3 align-top lg:table-cell">
                          {product.category?.name}
                        </td>

                        <td className="px-2 py-3 align-top">
                          <div className="font-bold">₹{product.discountPrice || product.price}</div>
                          {product.discountPrice && (
                            <div className="text-muted-foreground text-xs line-through">
                              ₹{product.price}
                            </div>
                          )}
                        </td>

                        <td className="text-muted-foreground px-2 py-3 align-top text-sm">
                          {product.stock}
                        </td>

                        <td className="px-2 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/products/${product._id}`} className="flex-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-fit justify-start border bg-blue-400 text-white"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                            </Link>

                            <Link href={`/admin/products/edit/${product._id}`} className="flex-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-fit justify-start border"
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            </Link>

                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-fit border text-center"
                              onClick={() => deleteProduct(product._id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </Button>

                  <span className="text-muted-foreground text-sm">
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

                <div className="text-muted-foreground text-sm">
                  Showing {startIdx + 1} -{" "}
                  {Math.min(startIdx + itemsPerPage, filteredProducts.length)} of{" "}
                  {filteredProducts.length}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
