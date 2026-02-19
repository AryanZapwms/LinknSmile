"use client"

import { useCartStore, Size } from "@/lib/store/cart-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Trash2, Phone } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore()
  const totalPrice = getTotalPrice()
  const router = useRouter()
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>

          <div className="flex flex-col items-center justify-center h-96">
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Link href="/shop">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card
                key={`${item.productId}-${item.selectedSize ? `${item.selectedSize.size}-${item.selectedSize.quantity}${item.selectedSize.unit}` : "default"}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="relative w-24 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image src={item.image || "/companylogo.jpg"} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
  {item.company?.name ?? "Unknown Brand"}
</p>

                      
                      {/* Size information */}
                      {item.selectedSize && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Size:</span> {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-border rounded">
                          <button
                            onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.selectedSize)}
                            className="px-2 py-1 text-muted-foreground hover:bg-muted"
                          >
                            −
                          </button>
                          <span className="px-3 py-1 font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => {
                              if (getTotalItems() >= 5) {
                                setShowBulkOrderModal(true)
                              } else {
                                updateQuantity(item.productId, item.quantity + 1, item.selectedSize)
                              }
                            }}
                            className="px-2 py-1 text-muted-foreground hover:bg-muted"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            ₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">₹{item.discountPrice || item.price} each</p>
                        </div>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.productId, item.selectedSize)}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 border-b border-border pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-semibold">₹0</span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </div>

                <Button
                  className="w-full cursor-pointer"
                  size="lg"
                  onClick={() => router.push("/checkout")}
                >
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-transparent cursor-pointer"
                  onClick={() => router.push("/shop")}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bulk Order Modal */}
        <Dialog open={showBulkOrderModal} onOpenChange={setShowBulkOrderModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center">Want to do a bulk order?</DialogTitle>
              <DialogDescription className="text-center pt-4">
                You've reached the maximum limit of 5 products in your cart. For bulk orders, please contact our team using the numbers below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <a
                href="tel:+919820623835"
                className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-blue-600 font-semibold">+91 9820623835</span>
              </a>
              <a
                href="tel:+919819079079"
                className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-blue-600 font-semibold">+91 9819079079</span>
              </a>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBulkOrderModal(false)}>
                Continue Shopping
              </Button>
              <a href="tel:+919820623835">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
