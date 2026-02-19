"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

interface OrderItem {
  product?: {
    _id?: string
    name?: string
    slug?: string
    image?: string
    company?: { slug?: string; name?: string }
  }
  productId?: string
  productName?: string
  quantity?: number
  price?: number
  selectedSize?: {
    size: string
    unit: string
    quantity: number
    price: number
    discountPrice?: number
  }
}

interface Order {
  _id: string
  orderNumber?: string
  items?: OrderItem[]
  totalAmount?: number
  orderStatus?: string
  paymentStatus?: string
  createdAt?: string
  updatedAt?: string
  paymentMethod?: string
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") {
      return
    }

    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }

    if (!session) {
      return
    }

    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/orders?userOrders=true")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const data = await res.json()

      // Ensure it's an array and shapes are safe
      if (Array.isArray(data)) {
        const normalized: Order[] = data.map((order: Order & { status?: string; items?: unknown }) => {
          const { status: legacyStatus, items, ...rest } = order
          return {
            ...rest,
            items: Array.isArray(items) ? (items as OrderItem[]) : [],
            orderStatus: rest.orderStatus ?? legacyStatus,
          }
        })
        setOrders(normalized)
      } else {
        setOrders([])
        console.warn("Orders endpoint returned non-array:", data)
      }
    } catch (err: any) {
      console.error("Error fetching orders:", err)
      setError(err?.message ?? "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800"

    const statusColors: { [key: string]: string } = {
      pending: "bg-purple-100 text-purple-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      canceled: "bg-red-100 text-red-800",
    }

    return statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800"
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-red-600 font-medium mb-2">Failed to load orders</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchOrders}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 md:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground">View and track your orders</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
                <Link href="/shop">
                  <Button>Start Shopping</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = order.items ?? []
              const createdAt = order.createdAt ? new Date(order.createdAt) : null
              const total = Number(order.totalAmount ?? 0)
              const statusLabel = order.orderStatus ?? "Unknown"
              const paymentStatusLabel = order.paymentStatus ?? "Unknown"

              return (
                <Card key={order._id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          Order #{order.orderNumber ?? order._id}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {createdAt ? createdAt.toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center justify-end">
                        <Badge className={`${getStatusColor(statusLabel)} px-2 py-1 rounded-full text-xs`}>
                          {statusLabel}
                        </Badge>
                        <Badge variant="outline" className="px-2 py-1 rounded-full text-xs">
                          {paymentStatusLabel}
                        </Badge>
                        {order.paymentMethod ? (
                          <Badge variant="secondary" className="px-2 py-1 rounded-full text-xs">
                            {order.paymentMethod.toUpperCase()}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Items</h4>
                        <div className="space-y-2">
                          {items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No items found for this order.</p>
                          ) : (
                            items.map((item, idx) => {
                              const quantity = Number(item.quantity ?? 0)
                              const price = Number(item.price ?? 0)
                              const productName = item.productName ?? item.product?.name ?? "Item"
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      {productName} x {quantity}
                                    </span>
                                    <span className="font-medium">₹{(price * quantity).toFixed(2)}</span>
                                  </div>
                                  {item.selectedSize && (
                                    <p className="text-xs text-gray-500 ml-0">
                                      Size: {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                                    </p>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border pt-4 flex justify-between">
                        <span className="font-semibold text-foreground">Total Amount</span>
                        <span className="font-bold text-lg">₹{total.toFixed(2)}</span>
                      </div>

                      <Link href={`/profile/orders/${order._id}`}>
                        <Button variant="outline" className="w-full bg-transparent">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
