// components/product-card.tsx
"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCartStore } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, Eye, Phone, Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
  slug: string
  size?: "sm" | "md"
  hasMultipleSizes?: boolean
  sizes?: Size[]
  stock?: number
  shopId?: string
  shopName?: string
  commissionRate?: number
}

export function ProductCard({
  id,
  name,
  price,
  discountPrice,
  image,
  slug,
  size = "sm",
  hasMultipleSizes = false,
  sizes = [],
  stock = 999,
  shopId,
  shopName,
  commissionRate,
}: ProductCardProps) {
  const { toast } = useToast()
  const { data: session } = useSession()
  const addItem = useCartStore((s) => s.addItem)
  const getTotalItems = useCartStore((s) => s.getTotalItems)
  const [selectedSize, setSelectedSize] = useState<Size | null>(null)
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)
  const [showQuickView, setShowQuickView] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const router = useRouter()

  const discount = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0
  const displayPrice =
    hasMultipleSizes && sizes.length > 0
      ? Math.min(...sizes.map((s) => s.discountPrice || s.price))
      : discountPrice || price

  const isOutOfStock = hasMultipleSizes
    ? sizes.every((s) => s.stock < 3)
    : stock < 3

  const hasImage = Boolean(image)
  const showFallback = !hasImage || imgError

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!session?.user) {
      toast({ title: "Sign in required", description: "Please sign in to add products to your cart.", variant: "destructive" })
      router.push("/auth/login")
      return
    }

    if (getTotalItems() >= 5) {
      setShowBulkOrderModal(true)
      return
    }

    if (hasMultipleSizes && sizes.length > 0 && !selectedSize) {
      toast({ title: "Size required", description: "Please select a size before adding to cart.", variant: "destructive" })
      return
    }

    if (hasMultipleSizes && sizes.length > 0 && selectedSize) {
      addItem({
        productId: id, name,
        price: selectedSize.price, discountPrice: selectedSize.discountPrice,
        image, quantity: 1, slug, stock: selectedSize.stock, selectedSize,
        shopId: (shopId || "default") as string,
        shopName: shopName || "LinkAndSmile",
        commissionRate: commissionRate || 10,
      })
      toast({ title: "Added to cart", description: `${name} (${selectedSize.size}) added.` })
      setSelectedSize(null)
    } else {
      addItem({
        productId: id, name, price, discountPrice, image, quantity: 1, slug, stock,
        shopId: shopId || "default",
        shopName: shopName || "LinkAndSmile",
        commissionRate: commissionRate || 10,
      })
      toast({ title: "Added to cart", description: `${name} added to your cart.` })
    }
  }

  return (
    <>
      <div className="group relative bg-white rounded-2xl border border-stone-100 hover:border-amber-200/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 overflow-hidden flex flex-col">

        {/* Image area */}
        <Link href={`/products/${id}`} className="block relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
          {/* Warm ambient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50" />

          {hasImage && !imgError && (
            <Image
              src={image!}
              alt={name}
              fill
              className={`object-contain object-center transition-all duration-500 group-hover:scale-[1.04] ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onLoadingComplete={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(true) }}
              priority={false}
            />
          )}

          {/* Skeleton / fallback */}
          {(!imgLoaded || showFallback) && (
            <div className="absolute inset-0 flex items-center justify-center">
              {!imgLoaded && hasImage && !imgError ? (
                <div className="w-7 h-7 border-2 border-stone-200 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-10 h-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          )}

          {/* Discount badge — amber, not red */}
          {discount > 0 && (
            <div className="absolute top-2.5 left-2.5 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 tracking-wide">
              {discount}% OFF
            </div>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="bg-stone-700 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide">Out of Stock</span>
            </div>
          )}

          {/* Wishlist button — top right, always visible softly */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWishlisted((w) => !w) }}
            className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm border border-stone-100 hover:border-amber-200 transition-all duration-200"
            aria-label="Wishlist"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors duration-200 ${wishlisted ? "fill-rose-400 text-rose-400" : "text-stone-400"}`}
            />
          </button>

          {/* Hover overlay — quick view */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-end justify-center pb-3">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true) }}
              className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-stone-700 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-md hover:bg-white transition-colors translate-y-2 group-hover:translate-y-0 duration-300"
            >
              <Eye className="w-3 h-3" />
              Quick view
            </button>
          </div>
        </Link>

        {/* Card body */}
        <div className="flex flex-col flex-1 p-3 gap-2.5">
          {/* Product name */}
          <Link href={`/products/${id}`} className="flex-1">
            <h3 className="text-[13px] font-medium text-stone-700 line-clamp-2 leading-snug group-hover:text-stone-900 transition-colors">
              {name}
            </h3>
          </Link>

          {/* Size selector */}
          {hasMultipleSizes && sizes.length > 0 && (
            <select
              value={selectedSize ? `${selectedSize.size}-${selectedSize.quantity}` : ""}
              onChange={(e) => {
                if (!e.target.value) { setSelectedSize(null); return }
                setSelectedSize(sizes.find((s) => `${s.size}-${s.quantity}` === e.target.value) || null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-xs px-2.5 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-300 focus:border-amber-300 transition-all"
            >
              <option value="">Select size…</option>
              {sizes.map((s, i) => (
                <option key={i} value={`${s.size}-${s.quantity}`} disabled={s.stock === 0}>
                  {s.size} ({s.quantity}{s.unit}) — ₹{s.discountPrice ?? s.price}
                </option>
              ))}
            </select>
          )}

          {/* Divider */}
          <div className="h-px bg-stone-100" />

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold text-stone-900 tracking-tight">
                ₹{Math.round(displayPrice).toLocaleString()}
              </span>
              {(discountPrice || (hasMultipleSizes && sizes.some((s) => s.discountPrice))) && (
                <span className="text-[11px] text-stone-400 line-through">
                  ₹{price.toLocaleString()}
                </span>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || (hasMultipleSizes && sizes.length > 0 && !selectedSize)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-xl transition-all duration-200 shrink-0 ${
                isOutOfStock
                  ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                  : "bg-stone-900 text-white hover:bg-amber-500 hover:text-white active:scale-95 shadow-sm hover:shadow-md"
              }`}
            >
              <ShoppingCart className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Order Modal */}
      <Dialog open={showBulkOrderModal} onOpenChange={setShowBulkOrderModal}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-900">Need a bulk order?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500 mb-4">
            You've reached the 5-item cart limit. For bulk orders, contact us directly.
          </p>
          <div className="space-y-2 mb-4">
            {["+91 9820623835", "+91 9819079079"].map((num) => (
              <a
                key={num}
                href={`tel:${num.replace(/\s/g, "")}`}
                className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100 hover:bg-amber-50 hover:border-amber-200 transition-colors"
              >
                <Phone className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-stone-700">{num}</span>
              </a>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowBulkOrderModal(false)}>
              Continue
            </Button>
            <Button className="flex-1 rounded-xl bg-stone-900 hover:bg-stone-800" onClick={() => { window.location.href = "tel:+919820623835" }}>
              Call Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick View */}
      <ProductQuickView
        open={showQuickView}
        onOpenChange={setShowQuickView}
        product={{ id, name, price, discountPrice, image, slug, sizes, stock, shopId, shopName, commissionRate }}
      />
    </>
  )
}