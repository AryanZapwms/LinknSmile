// components/product-quick-view.tsx
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
import { ShoppingCart, Star, Info, Package, ShieldCheck, ClipboardList, ArrowUpRight, Truck, RotateCcw } from "lucide-react"
import { useCartStore } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
    slug: string
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
  const { data: session } = useSession()
  const router = useRouter()
  const addItem = useCartStore((state) => state.addItem)
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const [selectedSize, setSelectedSize] = useState<Size | null>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
  )
  const [fullProduct, setFullProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => {
    if (open && product.id) {
      setLoading(true)
      setImgLoaded(false)
      fetch(`/api/products/${product.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setFullProduct(data)
            if (data.sizes?.length && !selectedSize) setSelectedSize(data.sizes[0])
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, product.id])

  const p = fullProduct || product

  const currentPrice = selectedSize?.price ?? p.price
  const currentDiscount = selectedSize?.discountPrice ?? p.discountPrice
  const discount = currentDiscount ? Math.round(((currentPrice - currentDiscount) / currentPrice) * 100) : 0
  const displayPrice = currentDiscount || currentPrice
  const isOutOfStock = selectedSize ? selectedSize.stock === 0 : (p.stock || 999) === 0

  const handleAddToCart = () => {
    if (!session?.user) {
      toast({ title: "Sign in required", description: "Please sign in to add products to your cart.", variant: "destructive" })
      onOpenChange(false)
      router.push("/auth/login")
      return
    }
    if (getTotalItems() >= 5) {
      toast({ title: "Cart limit reached", description: "Maximum 5 products. Contact us for bulk orders.", variant: "destructive" })
      return
    }
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({ title: "Select a size", description: "Please pick a size before adding to cart.", variant: "destructive" })
      return
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: selectedSize ? selectedSize.price : product.price,
      discountPrice: selectedSize ? selectedSize.discountPrice : product.discountPrice,
      image: product.image,
      quantity: 1,
      slug: product.slug,
      stock: selectedSize ? selectedSize.stock : (product.stock || 0),
      selectedSize: selectedSize || undefined,
      shopId: product.shopId || "default",
      shopName: product.shopName || "LinkAndSmile",
      commissionRate: product.commissionRate || 10,
    })
    toast({ title: "Added to cart", description: `${product.name} has been added to your cart.` })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl bg-white border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-[44%_56%]">

          {/* ── Image panel ── */}
          <div className="relative bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center p-8 min-h-[260px]">
            <div className="relative w-full aspect-square max-w-[280px]">
              {p.image && (
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  className={`object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoadingComplete={() => setImgLoaded(true)}
                />
              )}
              {(!p.image || !imgLoaded) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-stone-200 border-t-amber-400 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {discount > 0 && (
              <div className="absolute top-4 left-4 bg-amber-400 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                {discount}% OFF
              </div>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                <span className="bg-stone-800 text-white text-xs font-semibold px-4 py-1.5 rounded-full">Out of Stock</span>
              </div>
            )}
          </div>

          {/* ── Details panel ── */}
          <div className="flex flex-col h-full max-h-[85vh] overflow-y-auto p-6 md:p-7">

            {/* Seller */}
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
              {p.shopName || "LinkAndSmile"}
            </p>

            {/* Title */}
            <DialogHeader className="text-left mb-3 p-0">
              <DialogTitle className="text-xl font-bold text-stone-900 leading-snug">
                {p.name}
              </DialogTitle>
              <DialogDescription className="sr-only">{p.name} quick view</DialogDescription>
            </DialogHeader>

            {/* Stars */}
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs text-stone-400 ml-1">4.5 · Verified reviews</span>
            </div>

            {/* Price */}
            <div className="flex items-end gap-3 pb-4 mb-4 border-b border-stone-100">
              <span className="text-2xl font-black text-stone-900">
                ₹{Math.round(displayPrice).toLocaleString()}
              </span>
              {currentDiscount && (
                <span className="text-sm text-stone-400 line-through mb-0.5">
                  ₹{currentPrice.toLocaleString()}
                </span>
              )}
              {discount > 0 && (
                <span className="mb-0.5 text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                  {discount}% off
                </span>
              )}
            </div>

            {/* Size selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Select Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSize(s)}
                      disabled={s.stock === 0}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 ${
                        selectedSize?.size === s.size && selectedSize?.quantity === s.quantity
                          ? "bg-stone-900 border-stone-900 text-white"
                          : "bg-white border-stone-200 text-stone-600 hover:border-amber-300 hover:bg-amber-50"
                      } ${s.stock === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {s.size} · {s.quantity}{s.unit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA row */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={handleAddToCart}
                disabled={loading || isOutOfStock}
                className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isOutOfStock
                    ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                    : "bg-stone-900 text-white hover:bg-amber-500 hover:shadow-md active:scale-[0.98]"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                {loading ? "Loading…" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>

              <Link
                href={`/products/${product.id}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-1.5 px-4 h-11 rounded-xl border-2 border-stone-200 text-stone-600 text-xs font-semibold hover:border-amber-300 hover:text-amber-700 transition-all"
              >
                Full page <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Trust pills */}
            <div className="flex gap-2 flex-wrap mb-5">
              {[
                { icon: Truck, label: "Fast delivery" },
                { icon: ShieldCheck, label: "Authentic" },
                { icon: RotateCcw, label: "Easy return" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 border border-stone-100 rounded-lg text-[11px] font-semibold text-stone-500">
                  <Icon className="w-3 h-3 text-amber-500" />
                  {label}
                </div>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description" className="w-full flex-1">
              <TabsList className="grid w-full grid-cols-3 bg-stone-100 rounded-xl p-1 h-auto">
                {[
                  { value: "description", label: "Details" },
                  { value: "ingredients", label: "Ingredients" },
                  { value: "usage", label: "How to Use" },
                ].map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-lg py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm text-stone-400 transition-all"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-3 min-h-[80px]">
                <TabsContent value="description" className="mt-0 space-y-3">
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {p.description || "No description available for this product."}
                  </p>
                  {p.benefits && p.benefits.length > 0 && (
                    <ul className="space-y-1.5">
                      {p.benefits.map((b: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                          <span className="mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 text-[10px] font-bold">✓</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="ingredients" className="mt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {p.ingredients && p.ingredients.length > 0 ? (
                      p.ingredients.map((ing: string, i: number) => (
                        <span key={i} className="bg-amber-50 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-lg border border-amber-100">
                          {ing}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-stone-400 italic">No ingredients listed.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="usage" className="mt-0">
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {p.usage || "No usage instructions provided."}
                  </p>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}