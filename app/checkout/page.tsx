"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/lib/store/cart-store"
import { CheckoutForm } from "@/components/checkout-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trackInitiateCheckout } from "@/lib/facebook-pixel"
import { Store } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PaymentSettings {
  enableCOD: boolean
  enableRazorpay: boolean
}

// Small full-page loader + progress bar components
function TopProgressBar({ visible }: { visible: boolean }) {
  return (
    <div className={`fixed top-0 left-0 right-0 h-1 z-50 ${visible ? "block" : "hidden"}`}>
      <div className="h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-[progress_2s_linear_infinite]" />
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

function FullPageLoader({ message = "Processing your request..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white/95 dark:bg-neutral-900 shadow-2xl rounded-2xl p-6 flex items-center gap-4">
        <svg className="w-10 h-10 animate-spin" viewBox="0 0 50 50" aria-hidden>
          <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" strokeOpacity="0.15" />
          <path d="M45 25a20 20 0 00-20-20" fill="none" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div>
          <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{message}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Please don't close or reload the page.</p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  // ✅ MOVE THESE UP HERE - Get all cart functions at once
  const { 
    items, 
    getTotalPrice, 
    clearCart,
    getItemsByVendor,
    getCommissionBreakdown 
  } = useCartStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)

  // ✅ Calculate vendor breakdown early (will be empty until items load)
  const itemsByVendor = getItemsByVendor();
  const breakdown = getCommissionBreakdown();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login")
    }
  }, [status, router])

  // Track InitiateCheckout event
  useEffect(() => {
    if (items.length > 0) {
      const productIds = items.map(item => item.productId)
      trackInitiateCheckout(getTotalPrice(), items.length, productIds)
    }
  }, [])

  useEffect(() => {
    // Fetch payment settings and user profile
    const fetchData = async () => {
      try {
        // Fetch payment settings
        const settingsRes = await fetch("/api/admin/payment-settings")
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setPaymentSettings(data)
        } else {
          setPaymentSettings({ enableCOD: true, enableRazorpay: true })
        }

        // Fetch user profile data
        const profileRes = await fetch("/api/users/profile")
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setUserData(profileData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        // Default to both enabled if error
        setPaymentSettings({ enableCOD: true, enableRazorpay: true })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      try {
        document.body.removeChild(script)
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const handleCheckout = async (shippingAddress: any, paymentMethod: string) => {
    setIsLoading(true)

    // Helper: clear the server-side cart in DB immediately after order
    const clearServerCart = async () => {
      try {
        await fetch("/api/cart", { method: "DELETE" })
      } catch (e) {
        console.warn("Could not clear server cart:", e)
      }
    }

    try {
      // Handle COD payment - Create order immediately
      if (paymentMethod === "cod") {
        const orderResponse = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              product: item.productId,
              quantity: item.quantity,
              price: item.discountPrice || item.price,
              selectedSize: item.selectedSize,
              // ✅ ADD VENDOR INFO TO ORDER
              shopId: item.shopId,
              shopName: item.shopName,
              commissionRate: item.commissionRate || 10,
            })),
            shippingAddress,
            totalAmount: getTotalPrice(),
            paymentMethod: "cod",
            paymentStatus: "pending",
          }),
        })

        const orderData = await orderResponse.json()

        if (!orderResponse.ok) {
          throw new Error(orderData.error)
        }

        clearCart()
        await clearServerCart()
        setIsLoading(false)
        router.push(`/order-success/${orderData.orderId}`)
        return
      }

      // Handle Razorpay payment
      if (paymentMethod === "razorpay") {
        const razorpayResponse = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: getTotalPrice(),
          }),
        })

        const razorpayOrder = await razorpayResponse.json()

        if (!razorpayResponse.ok) {
          throw new Error(razorpayOrder.error || "Failed to create Razorpay order")
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "LinkAndSmile",
          description: "Multi-vendor Marketplace",
          handler: async (response: any) => {
            try {
              const verifyResponse = await fetch("/api/razorpay/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  items: items.map((item) => ({
                    product: item.productId,
                    quantity: item.quantity,
                    price: item.discountPrice || item.price,
                    selectedSize: item.selectedSize,
                    // ✅ ADD VENDOR INFO
                    shopId: item.shopId,
                    shopName: item.shopName,
                    commissionRate: item.commissionRate || 10,
                  })),
                  shippingAddress,
                  totalAmount: getTotalPrice(),
                }),
              })

              const verifyData = await verifyResponse.json()

              if (verifyResponse.ok && verifyData.orderId) {
                clearCart()
                await clearServerCart()
                setIsLoading(false)
                router.push(`/order-success/${verifyData.orderId}`)
              } else {
                setIsLoading(false)
                alert("Payment verification failed. Please contact support.")
              }
            } catch (error) {
              console.error("Payment verification error:", error)
              setIsLoading(false)
              alert("Payment verification failed. Please try again.")
            }
          },
          modal: {
            ondismiss: () => {
              alert("Payment cancelled. Your order was not created.")
              setIsLoading(false)
            },
          },
          prefill: {
            email: session?.user?.email,
            name: session?.user?.name,
          },
        }

        const razorpay = new window.Razorpay(options)
        razorpay.open()
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert(`Checkout failed: ${error instanceof Error ? error.message : "Please try again."}`)
      setIsLoading(false)
    }
  }

  const getAvailablePaymentMethods = (): string[] => {
    if (!paymentSettings) return ["razorpay"]
    const methods: string[] = []
    if (paymentSettings.enableRazorpay) methods.push("razorpay")
    if (paymentSettings.enableCOD) methods.push("cod")
    return methods.length > 0 ? methods : ["razorpay"]
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading checkout...</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const totalPrice = getTotalPrice()
  const availablePaymentMethods = getAvailablePaymentMethods()

  return (
    <main className="min-h-screen bg-background">
      <TopProgressBar visible={isLoading} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ✅ VENDOR BREAKDOWN - Show if multiple vendors */}
          {Object.keys(itemsByVendor).length > 1 && (
            <div className="lg:col-span-3 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Items from {Object.keys(itemsByVendor).length} Vendor{Object.keys(itemsByVendor).length > 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(itemsByVendor).map(([shopId, vendorItems]) => {
                    const vendorInfo = breakdown.byVendor.find(v => v.shopId === shopId);
                    
                    return (
                      <div key={shopId} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg">{vendorItems[0]?.shopName || 'LinkAndSmile Platform'}</h3>
                          <span className="text-sm text-muted-foreground bg-background px-3 py-1 rounded-full">
                            {vendorItems.length} item{vendorItems.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          {vendorItems.map((item) => (
                            <div key={item.productId} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {item.name} x {item.quantity}
                              </span>
                              <span className="font-medium">₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        
                        {vendorInfo && (
                          <div className="pt-3 border-t space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span className="font-semibold">₹{vendorInfo.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Platform Fee ({vendorInfo.commissionRate}%):</span>
                              <span>₹{vendorInfo.commission.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-green-600">
                              <span>Vendor Earnings:</span>
                              <span>₹{vendorInfo.earnings.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <CheckoutForm
              totalAmount={totalPrice}
              onSubmit={handleCheckout}
              availablePaymentMethods={availablePaymentMethods}
              initialData={{
                name: userData?.name || session?.user?.name || "",
                phone: userData?.phone || "",
                street: userData?.address || "",
                city: userData?.city || "",
                state: userData?.state || "",
                zipCode: userData?.pincode || "",
                country: "India",
              }}
              isSubmitting={isLoading}
            />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.productId} className="text-sm border-b pb-3 last:border-b-0">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-semibold">
                        ₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    {item.selectedSize && (
                      <div className="text-xs text-gray-600 mt-1">
                        Size: {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                      </div>
                    )}
                    {/* ✅ Show vendor name per item */}
                    {item.shopName && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        {item.shopName}
                      </div>
                    )}
                  </div>
                ))}

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold">Free</span>
                  </div>
                  {/* ✅ Show total commission if multi-vendor */}
                  {breakdown.totalCommission > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Platform Commission</span>
                      <span>₹{breakdown.totalCommission.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isLoading && <FullPageLoader message={"Processing your payment..."} />}
    </main>
  )
}