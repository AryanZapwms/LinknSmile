// app/cart/page.tsx
"use client"

import { useCartStore } from "@/lib/store/cart-store"
import Link from "next/link"
import Image from "next/image"
import { Trash2, Phone, ShoppingBag, Minus, Plus, ChevronRight, ShieldCheck, Truck } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore()
  const totalPrice = getTotalPrice()
  const router = useRouter()
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-8 h-8 text-stone-300" />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">Your cart is empty</h2>
          <p className="text-sm text-stone-400 mb-6">
            Looks like you haven't added anything yet. Browse our collection to find something you'll love.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-stone-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-amber-500 transition-all duration-200"
          >
            Browse Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    )
  }

  const sizeKey = (item: typeof items[0]) =>
    item.selectedSize ? `${item.selectedSize.size}-${item.selectedSize.quantity}` : undefined

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1">Your order</p>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900">
            Shopping Cart
            <span className="ml-3 text-base font-medium text-stone-400">({getTotalItems()} item{getTotalItems() !== 1 ? "s" : ""})</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* ── Cart items ── */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.productId}-${sizeKey(item) ?? "default"}`}
                className="bg-white rounded-2xl border border-stone-100 hover:border-stone-200 transition-colors p-4 flex gap-4"
              >
                {/* Image */}
                <Link href={`/products/${item.productId}`} className="shrink-0">
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gradient-to-br from-stone-50 to-amber-50/30 border border-stone-100">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">No image</div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.productId}`}>
                    <h3 className="text-sm font-semibold text-stone-800 line-clamp-2 hover:text-amber-700 transition-colors leading-snug">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {item.shopName || "LinkAndSmile"}
                  </p>
                  {item.selectedSize && (
                    <p className="text-xs text-stone-500 mt-1">
                      <span className="font-medium">Size:</span>{" "}
                      {item.selectedSize.size} · {item.selectedSize.quantity}{item.selectedSize.unit}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 gap-4">
                    {/* Qty control */}
                    <div className="flex items-center border-2 border-stone-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, Math.max(1, item.quantity - 1), sizeKey(item))
                        }
                        className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-stone-900 border-x-2 border-stone-200 py-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          if (getTotalItems() >= 5) {
                            setShowBulkOrderModal(true)
                          } else {
                            updateQuantity(item.productId, item.quantity + 1, sizeKey(item))
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-base font-bold text-stone-900">
                        ₹{Math.round((item.discountPrice || item.price) * item.quantity).toLocaleString()}
                      </p>
                      <p className="text-xs text-stone-400">
                        ₹{(item.discountPrice || item.price).toLocaleString()} each
                      </p>
                    </div>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.productId, sizeKey(item))}
                  className="shrink-0 self-start w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-red-400 hover:bg-red-50 transition-all"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Continue shopping */}
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors pt-1"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Continue shopping
            </Link>
          </div>

          {/* ── Order summary ── */}
          <div className="lg:self-start lg:sticky lg:top-6">
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-stone-100">
                <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Order Summary</h2>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Line items */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Subtotal ({getTotalItems()} items)</span>
                    <span className="font-semibold text-stone-800">₹{Math.round(totalPrice).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Tax</span>
                    <span className="font-semibold text-stone-800">Included</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-stone-100" />

                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-stone-900">Total</span>
                  <span className="text-xl font-black text-stone-900">
                    ₹{Math.round(totalPrice).toLocaleString()}
                  </span>
                </div>

                {/* CTA */}
                <button
                  onClick={() => router.push("/checkout")}
                  className="w-full h-12 mt-1 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-amber-500 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                >
                  Proceed to Checkout
                </button>
              </div>

              {/* Trust strip */}
              <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  Secure checkout
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
                  <Truck className="w-3.5 h-3.5 text-amber-500" />
                  Free delivery
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk order modal */}
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
            <Button
              className="flex-1 rounded-xl bg-stone-900 hover:bg-amber-500 transition-colors"
              onClick={() => { window.location.href = "tel:+919820623835" }}
            >
              Call Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main> 
  )
}