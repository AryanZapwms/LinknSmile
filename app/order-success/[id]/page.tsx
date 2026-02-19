"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { trackPurchase } from "@/lib/facebook-pixel"
import { useSession } from "next-auth/react"

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

export default function OrderSuccessPage() {
  const params = useParams()
  const orderId = params.id as string
  const { data: session } = useSession()
  const [orderData, setOrderData] = useState<any>(null)

  useEffect(() => {
    // Fire conversion event with transaction_id
    if (window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-602275335/U1R3CO3tn6wbEIf8l58C',
        'transaction_id': orderId
      })
    }
  }, [orderId])

  // Fetch order data and track purchase
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrderData(data)

          // Track Purchase event for Facebook Pixel with INR currency
          if (data?.items && data?.totalAmount) {
            const productIds = data.items.map((item: any) => item.product?._id || item.product)
            trackPurchase(
              orderId,
              data.totalAmount,
              data.items.length,
              productIds,
              session?.user?.email
            )
          }
        }
      } catch (error) {
        console.error('Error fetching order data:', error)
      }
    }

    if (orderId) {
      fetchOrderData()
    }
  }, [orderId, session?.user?.email])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Order Placed Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">Thank you for your purchase. Your order has been confirmed.</p>

          <div className="bg-muted p-4 rounded">
            <p className="text-sm text-muted-foreground">Order ID</p>
            <p className="font-mono font-semibold text-foreground">{orderId}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            You will receive an email confirmation shortly with tracking information.
          </p>

          <div className="space-y-2 pt-4">
            <Link href={`/profile/orders/${orderId}`} className="block">

              <Button className="w-full">View Your Order Details</Button>
            </Link>
            <Link href="/shop" className="block">
              <Button variant="outline" className="w-full bg-transparent">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
