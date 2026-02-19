"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCartStore } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, Star, Phone, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { ProductQuickView } from "./product-quick-view"



interface Size {
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
}

interface ProductCardProps {
  id: string
  name: string
  price: number
  discountPrice?: number
  image?: string
  company: { _id: string; name: string; slug: string }
  size?: "sm" | "md"
  hasMultipleSizes?: boolean
  sizes?: Size[]
  stock?: number
    shopId?: string;
  shopName?: string;
  commissionRate?: number;
}

export function ProductCard({
  id,
  name,
  price,
  discountPrice,
  image,
  company,
  size = "sm",
  hasMultipleSizes = false,
  sizes = [],
  stock = 999,
  shopId,
  shopName,
  commissionRate, 
}: ProductCardProps) {
  const { toast } = useToast()
  const addItem = useCartStore((state) => state.addItem)
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const [selectedSize, setSelectedSize] = useState<Size | null>(null)
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)
  const [showQuickView, setShowQuickView] = useState(false)
  const discount = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0
  const isSmall = size === "sm"
const router = useRouter()

  // Display lowest price if multiple sizes exist
  const displayPrice = hasMultipleSizes && sizes.length > 0
    ? Math.min(...sizes.map(s => s.discountPrice || s.price))
    : discountPrice || price

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Check cart limit - max 5 products
    const totalItems = getTotalItems()
    if (totalItems >= 5) {
      setShowBulkOrderModal(true)
      return
    }

    // If product has multiple sizes, require selection
    if (hasMultipleSizes && sizes.length > 0) {
      if (!selectedSize) {
        toast({
          title: "Size required",
          description: "Please select a size before adding to cart.",
          variant: "destructive",
        })
        return
      }

      addItem({
        productId: id,
        name,
        price: selectedSize.price,
        discountPrice: selectedSize.discountPrice,
        image,
        quantity: 1,
        company,
        slug: company.slug,
        stock: selectedSize.stock,
        selectedSize,
        shopId: (shopId || "default") as string,
      shopName: shopName || 'LinkAndSmile',
      commissionRate: commissionRate || 10,
      })

      toast({
        title: "Added to cart",
        description: `${name} (${selectedSize.size}) has been added to your cart.`,
      })
      setSelectedSize(null)
    } else {
      addItem({
        productId: id,
        name,
        price,
        discountPrice,
        image,
        quantity: 1,
        company,
        shopId: shopId || undefined,
      shopName: shopName || 'LinkAndSmile',
      commissionRate: commissionRate || 10,
      })

      toast({
        title: "Added to cart",
        description: `${name} has been added to your cart.`,
      })
    }
  }

  // Image loading / fallback states
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  // When there's no product image at all, immediately treat as error so fallback shows
  const hasImage = Boolean(image)
  const showFallback = !hasImage || imgError

  // Check if product is out of stock
  const isOutOfStock = hasMultipleSizes
    ? sizes.every(s => s.stock < 3)
    : stock < 3

  return (
    <Card
      className={`group overflow-hidden hover:shadow-lg transition-all duration-200 border border-border bg-card w-full p-0 flex flex-col ${isSmall ? "rounded-md" : "rounded-lg"}`}
      style={{ backgroundColor: "#faf5ff" }}
    >
      <div
  onClick={(e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowQuickView(true)
  }}
  className="flex-1 flex flex-col no-underline cursor-pointer relative"
>
        <CardContent className="p-0">
          <div className={`relative w-full ${isSmall ? "h-36" : "h-44"} bg-muted overflow-hidden`}>
            {/* Quick View Overlay Button */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center">
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white/90 hover:bg-white text-purple-700 font-semibold shadow-lg"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowQuickView(true)
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Quick View
              </Button>
            </div>


            {/* Actual product image (fills area) */}
            {hasImage && !imgError && (
              <Image
                src={image!}
                alt={name}
                fill
                className="object-contain object-center"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                onLoadingComplete={() => setImgLoaded(true)}
                onError={() => {
                  setImgError(true)
                  setImgLoaded(true)
                }}
                priority={false}
              />
            )}

            {/* Fallback / loader: only show when image hasn't loaded or there's an error */}
            {(!imgLoaded || showFallback) && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="flex flex-col items-center gap-2">
                  <div className={`${isSmall ? "w-20 h-20" : "w-28 h-28"} relative rounded-full overflow-hidden bg-white flex items-center justify-center shadow-sm`}>
                    <Image
                      src="/companylogo.jpg"
                      alt="logo"
                      fill
                      className="object-contain"
                      priority={false}
                    />
                  </div>

                  {/* Show loading indicator only if still loading */}
                  {!imgLoaded && hasImage && !imgError && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="animate-pulse text-xs text-muted-foreground">Loading image</div>
                      <svg className="animate-spin -ml-1 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* discount badge */}
            {discount > 0 && (
              <div
                className={`absolute top-2 left-2 px-2 py-0.5 rounded-md font-semibold shadow-lg z-10 ${isSmall ? "text-xs" : "text-sm"}`}
                style={{ backgroundColor: "#C53030", color: "white" }}
              >
                {discount}% OFF
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className={`flex flex-col p-3 ${isSmall ? "pt-2 pb-3" : "pt-3 pb-4"} flex-1`}>
          <div className="w-full flex-1 flex flex-col">
            <p className={`${isSmall ? "text-[10px]" : "text-xs"} text-muted-foreground mb-0.5 uppercase tracking-wide font-medium`}>
            {company?.name || "Unknown Brand"}

            </p>

            <h3
              className={`product-title ${isSmall ? "text-sm min-h-[2.5rem]" : "text-base min-h-[3rem]"} text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight mb-1`}
              title={name}
            >
              {name}
            </h3>

            <div className="hidden sm:flex items-center gap-1 mb-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`${isSmall ? "w-3 h-3" : "w-4 h-4"} fill-yellow-400 text-yellow-400`} />
                ))}
              </div>
              <span className={`${isSmall ? "text-xs" : "text-sm"} text-muted-foreground`}> (4.5)</span>
            </div>
          </div>

          <div className="w-full space-y-2 mt-auto">
            <div className="flex items-center gap-2 flex-wrap">
              {(discountPrice || (hasMultipleSizes && sizes.length > 0)) ? (
                <>
                  <span className={`${isSmall ? "text-sm" : "text-lg"} font-bold text-foreground`}>
                    ₹{Math.round(displayPrice).toLocaleString()}
                  </span>
                  <span className={`${isSmall ? "text-xs" : "text-sm"} text-muted-foreground line-through`}>
                    ₹{price.toLocaleString()}
                  </span>
                  {hasMultipleSizes && sizes.length > 0 && (
                    <span className={`${isSmall ? "text-xs" : "text-sm"} text-muted-foreground`}>
                      From
                    </span>
                  )}
                </>
              ) : (
                <span className={`${isSmall ? "text-sm" : "text-lg"} font-bold text-foreground`}>
                  ₹{price.toLocaleString()}
                </span>
              )}
            </div>

            {/* Size selector for multiple sizes */}
            {hasMultipleSizes && sizes.length > 0 && (
              <select
                value={selectedSize ? `${selectedSize.size}-${selectedSize.quantity}` : ""}
                onChange={(e) => {
                  if (!e.target.value) {
                    setSelectedSize(null)
                    return
                  }
                  const selected = sizes.find(
                    (s) => `${s.size}-${s.quantity}` === e.target.value
                  )
                  setSelectedSize(selected || null)
                }}
                className={`w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-purple-500 ${isSmall ? "text-[10px]" : "text-xs"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select size...</option>
                {sizes.map((s, idx) => (
                  <option
                    key={idx}
                    value={`${s.size}-${s.quantity}`}
                    disabled={s.stock === 0}
                  >
                    {s.size} ({s.quantity}{s.unit}) - ₹{s.discountPrice ? s.discountPrice : s.price}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="gold"
              className={`w-full ${isSmall ? "h-8 text-xs" : "h-9 text-sm"} font-medium flex items-center justify-center cursor-pointer`}
              size={isSmall ? "sm" : "default"}
              onClick={handleAddToCart}
              disabled={isOutOfStock || (hasMultipleSizes && sizes.length > 0 && !selectedSize)}
              style={{ backgroundColor: isOutOfStock ? "#9CA3AF" : "#7c3aed" }}
            >
              {isOutOfStock ? (
                "Out of Stock"
              ) : (
                <>
                  <ShoppingCart className={`${isSmall ? "w-3 h-3 mr-1.5" : "w-4 h-4 mr-2"}`} />
                  Add
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </div>

      {/* Bulk Order Modal */}
      <Dialog open={showBulkOrderModal} onOpenChange={setShowBulkOrderModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Want to do a bulk order?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You've reached the maximum of 5 products in your cart. For bulk orders, please contact us directly.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <p className="font-semibold text-sm text-gray-900">Contact Our Team:</p>
              <div className="space-y-2">
                <a
                  href="tel:+919820623835"
                  className="flex items-center gap-3 p-2 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">+91 9820623835</span>
                </a>
                <a
                  href="tel:+919819079079"
                  className="flex items-center gap-3 p-2 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">+91 9819079079</span>
                </a>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowBulkOrderModal(false)}
              >
                Continue Shopping
              </Button>
              <Button
                className="flex-1"
                style={{ backgroundColor: "#7c3aed" }}
                onClick={() => {
                  window.location.href = "tel:+919820623835"
                }}
              >
                Call Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Quick View Modal */}
      <ProductQuickView
        open={showQuickView}
        onOpenChange={setShowQuickView}
        product={{
          id,
          name,
          price,
          discountPrice,
          image,
          company,
          sizes,
          stock,
          shopId,
          shopName,
          commissionRate,
        }}
      />
    </Card>

  )
}