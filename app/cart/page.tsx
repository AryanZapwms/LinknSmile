// app/cart/page.tsx
"use client";

import { useCartStore } from "@/lib/store/cart-store";
import Link from "next/link";
import Image from "next/image";
import {
  Trash2,
  Phone,
  ShoppingBag,
  Minus,
  Plus,
  ChevronRight,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();
  const totalPrice = getTotalPrice();
  const router = useRouter();
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
            <ShoppingBag className="h-8 w-8 text-stone-300" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-stone-800">Your cart is empty</h2>
          <p className="mb-6 text-sm text-stone-400">
            Looks like you haven't added anything yet. Browse our collection to find something
            you'll love.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-amber-500"
          >
            Browse Products <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  const sizeKey = (item: (typeof items)[0]) =>
    item.selectedSize ? `${item.selectedSize.size}-${item.selectedSize.quantity}` : undefined;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        {/* Page header */}
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold tracking-widest text-amber-600 uppercase">
            Your order
          </p>
          <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">
            Shopping Cart
            <span className="ml-3 text-base font-medium text-stone-400">
              ({getTotalItems()} item{getTotalItems() !== 1 ? "s" : ""})
            </span>
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Cart items ── */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.productId}-${sizeKey(item) ?? "default"}`}
                className="flex gap-4 rounded-2xl border border-stone-100 bg-white p-4 transition-colors hover:border-stone-200"
              >
                {/* Image */}
                <Link href={`/products/${item.productId}`} className="shrink-0">
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-stone-100 bg-gradient-to-br from-stone-50 to-amber-50/30 md:h-24 md:w-24">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-contain p-1" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-stone-300">
                        No image
                      </div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.productId}`}>
                    <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-stone-800 transition-colors hover:text-amber-700">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="mt-0.5 text-xs text-stone-400">{item.shopName || "LinkAndSmile"}</p>
                  {item.selectedSize && (
                    <p className="mt-1 text-xs text-stone-500">
                      <span className="font-medium">Size:</span> {item.selectedSize.size} ·{" "}
                      {item.selectedSize.quantity}
                      {item.selectedSize.unit}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-4">
                    {/* Qty control */}
                    <div className="flex items-center overflow-hidden rounded-xl border-2 border-stone-200">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Math.max(1, item.quantity - 1),
                            sizeKey(item)
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center text-stone-500 transition-colors hover:bg-stone-50"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 border-x-2 border-stone-200 py-1 text-center text-sm font-bold text-stone-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          if (getTotalItems() >= 5) {
                            setShowBulkOrderModal(true);
                          } else {
                            updateQuantity(item.productId, item.quantity + 1, sizeKey(item));
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center text-stone-500 transition-colors hover:bg-stone-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-base font-bold text-stone-900">
                        ₹
                        {Math.round(
                          (item.discountPrice || item.price) * item.quantity
                        ).toLocaleString()}
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg text-stone-300 transition-all hover:bg-red-50 hover:text-red-400"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Continue shopping */}
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-amber-600 transition-colors hover:text-amber-700"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Continue shopping
            </Link>
          </div>

          {/* ── Order summary ── */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
              {/* Header */}
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-sm font-bold tracking-wider text-stone-900 uppercase">
                  Order Summary
                </h2>
              </div>

              <div className="space-y-3 px-5 py-4">
                {/* Line items */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Subtotal ({getTotalItems()} items)</span>
                    <span className="font-semibold text-stone-800">
                      ₹{Math.round(totalPrice).toLocaleString()}
                    </span>
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
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-stone-900">Total</span>
                  <span className="text-xl font-black text-stone-900">
                    ₹{Math.round(totalPrice).toLocaleString()}
                  </span>
                </div>

                {/* CTA */}
                <button
                  onClick={() => router.push("/checkout")}
                  className="mt-1 h-12 w-full rounded-xl bg-stone-900 text-sm font-bold text-white transition-all duration-200 hover:bg-amber-500 hover:shadow-md active:scale-[0.98]"
                >
                  Proceed to Checkout
                </button>
              </div>

              {/* Trust strip */}
              <div className="flex items-center gap-4 border-t border-stone-100 bg-stone-50 px-5 py-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                  Secure checkout
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
                  <Truck className="h-3.5 w-3.5 text-amber-500" />
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
            <DialogTitle className="text-base font-bold text-stone-900">
              Need a bulk order?
            </DialogTitle>
          </DialogHeader>
          <p className="mb-4 text-sm text-stone-500">
            You've reached the 5-item cart limit. For bulk orders, contact us directly.
          </p>
          <div className="mb-4 space-y-2">
            {["+91 9820623835", "+91 9819079079"].map((num) => (
              <a
                key={num}
                href={`tel:${num.replace(/\s/g, "")}`}
                className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3 transition-colors hover:border-amber-200 hover:bg-amber-50"
              >
                <Phone className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-stone-700">{num}</span>
              </a>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setShowBulkOrderModal(false)}
            >
              Continue
            </Button>
            <Button
              className="flex-1 rounded-xl bg-stone-900 transition-colors hover:bg-amber-500"
              onClick={() => {
                window.location.href = "tel:+919820623835";
              }}
            >
              Call Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
