"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Star, Info, Package, ShieldCheck, ClipboardList } from "lucide-react"
import { useCartStore } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Size {
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
}

interface ProductQuickViewProps {
  product: {
    id: string
    name: string
    price: number
    discountPrice?: number
    image?: string
    company: { _id: string; name: string; slug: string }
    description?: string
    ingredients?: string[]
    benefits?: string[]
    usage?: string
    suitableFor?: string[]
    sizes?: Size[]
    stock?: number
    shopId?: string
    shopName?: string
    commissionRate?: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductQuickView({ product, open, onOpenChange }: ProductQuickViewProps) {
  const { toast } = useToast()
  const addItem = useCartStore((state) => state.addItem)
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const [selectedSize, setSelectedSize] = useState<Size | null>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
  )
  const [fullProduct, setFullProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && product.id) {
      const fetchDetails = async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/products/${product.id}`)
          if (res.ok) {
            const data = await res.json()
            setFullProduct(data)
            if (data.sizes && data.sizes.length > 0 && !selectedSize) {
                setSelectedSize(data.sizes[0])
            }
          }
        } catch (error) {
          console.error("Failed to fetch product details:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchDetails()
    }
  }, [open, product.id])

  // Use fullProduct data if available, otherwise fallback to props
  const p = fullProduct || product

  const discount = p.discountPrice 
    ? Math.round(((p.price - p.discountPrice) / p.price) * 100) 
    : 0

  const handleAddToCart = () => {
    const totalItems = getTotalItems()
    if (totalItems >= 5) {
      toast({
        title: "Cart Limit",
        description: "Maximum 5 products allowed for retail orders. Contact us for bulk orders.",
        variant: "destructive",
      })
      return
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({
        title: "Select Size",
        description: "Please select a size before adding to cart.",
        variant: "destructive",
      })
      return
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: selectedSize ? selectedSize.price : product.price,
      discountPrice: selectedSize ? selectedSize.discountPrice : product.discountPrice,
      image: product.image,
      quantity: 1,
      company: product.company,
      slug: product.company.slug,
      stock: selectedSize ? selectedSize.stock : (product.stock || 0),
      selectedSize: selectedSize || undefined,
      shopId: product.shopId || "default",
      shopName: product.shopName || "LinkAndSmile",
      commissionRate: product.commissionRate || 10,
    })

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Section */}
          <div className="relative aspect-square bg-purple-50 flex items-center justify-center p-8">
            <div className="relative w-full h-full">
              <Image
                src={p.image || "/companylogo.jpg"}
                alt={p.name}
                fill
                className="object-contain"
              />
            </div>
            {discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-red-600 hover:bg-red-700">
                {discount}% OFF
              </Badge>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 md:p-8 flex flex-col h-full max-h-[90vh] overflow-y-auto">
            <DialogHeader className="text-left mb-4">
             <div className="flex items-center gap-2 mb-1">
  {p.company ? (
    <Link
      href={`/shop/${p.company.slug}`}
      className="text-xs uppercase tracking-widest text-purple-600 font-bold hover:underline"
    >
      {p.company.name}
    </Link>
  ) : (
    <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">
      No Brand
    </span>
  )}
  <span className="text-xs text-muted-foreground">•</span>
  <span className="text-xs font-medium text-muted-foreground">
    Sold by: {p.shopName || "LinkAndSmile"}
  </span>
</div>

              <DialogTitle className="text-2xl font-bold leading-tight">
                {p.name}
              </DialogTitle>
              <div className="flex items-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-muted-foreground ml-1">(4.5 Rating)</span>
              </div>
            </DialogHeader>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-gray-900">
                ₹{(selectedSize?.discountPrice || selectedSize?.price || product.discountPrice || product.price).toLocaleString()}
              </span>
              {(product.discountPrice || (selectedSize && selectedSize.discountPrice)) && (
                <span className="text-lg text-muted-foreground line-through">
                  ₹{(selectedSize?.price || product.price).toLocaleString()}
                </span>
              )}
            </div>

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold mb-3">Select Size:</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSize(s)}
                      disabled={s.stock === 0}
                      className={`px-4 py-2 text-sm rounded-full border transition-all ${
                        selectedSize?.size === s.size
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:border-purple-300"
                      } ${s.stock === 0 ? "opacity-50 cursor-not-allowed grayscale" : "cursor-pointer"}`}
                    >
                      {s.size} {s.quantity}{s.unit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 mb-8">
              <Button 
                onClick={handleAddToCart}
                className="flex-1 bg-purple-600 hover:bg-purple-700 h-12 text-lg font-semibold"
                disabled={loading || p.stock === 0 || (!!selectedSize && selectedSize.stock === 0)}
              >
                {loading ? "Loading..." : (p.stock === 0 || (selectedSize && selectedSize.stock === 0) ? "Out of Stock" : "Add to Cart")}
              </Button>
            </div>

            {/* Tabs for content */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-purple-50/50">
                <TabsTrigger value="description">Details</TabsTrigger>
                <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1">
                      <Info className="w-4 h-4 text-purple-600" />
                      About Product
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {p.description || "No description available for this product."}
                    </p>
                  </div>
                  {p.benefits && p.benefits.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1">
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        Key Benefits
                      </h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {p.benefits.map((b: any, i: number) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="ingredients" className="pt-4">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                  <Package className="w-4 h-4 text-purple-600" />
                  What's inside:
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.ingredients && p.ingredients.length > 0 ? (
                    p.ingredients.map((ing: any, i: number) => (
                      <Badge key={i} variant="secondary" className="bg-purple-100/50 text-purple-700">
                        {ing}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No ingredients listed.</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="usage" className="pt-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                  <ClipboardList className="w-4 h-4 text-purple-600" />
                  How to Use
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {p.usage || "No usage instructions provided."}
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
