"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Eye, MapPin, CreditCard, Package } from "lucide-react"

interface OrderItem {
  product?: {
    _id?: string
    name?: string
    sizes?: Array<{
      size: string
      unit: string
      quantity: number
      price: number
      discountPrice?: number
    }>
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

interface ShippingAddress {
  name?: string
  phone?: string
  street?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  zipCode?: string
  country?: string
}

interface Order {
  _id: string
  orderNumber?: string
  user?: {
    _id?: string
    name?: string
    email?: string
    phone?: string
  }
  items: OrderItem[]
  shippingAddress?: ShippingAddress
  totalAmount: number
  paymentStatus?: string
  paymentMethod?: string
  orderStatus?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  createdAt?: string
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }

    if ((session.user as any)?.role !== "admin") {
      router.push("/")
      return
    }

    fetchOrders()
  }, [session, router])

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : data.orders || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: newStatus }),
      })

      if (!res.ok) throw new Error("Failed to update order")
      await fetchOrders()

      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, orderStatus: newStatus })
      }
    } catch (error) {
      console.error("Error updating order:", error)
    } finally {
      setUpdatingId(null)
    }
  }

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      })

      if (!res.ok) throw new Error("Failed to update payment status")
      await fetchOrders()

      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: newStatus })
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setShowDetails(true)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading orders...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Orders Management</h1>

        <Card>
          <CardHeader>
            <CardTitle>All Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No orders found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold">Items</th>
                      <th className="text-left py-3 px-4 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold">Payment</th>
                      <th className="text-left py-3 px-4 font-semibold">Method</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{order.orderNumber || order._id.slice(-6)}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{order.user?.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{order.user?.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <Badge variant="outline">{order.items?.length || 0} items</Badge>
                        </td>
                        <td className="py-3 px-4 font-semibold">₹{(order.totalAmount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <Select
                            value={order.paymentStatus || "pending"}
                            onValueChange={(value) => updatePaymentStatus(order._id, value)}
                            disabled={updatingId === order._id}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={order.paymentMethod === "cod" ? "secondary" : "default"}>
                            {order.paymentMethod === "cod" ? "COD" : "Razorpay"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Select
                            value={order.orderStatus || "pending"}
                            onValueChange={(value) => updateOrderStatus(order._id, value)}
                            disabled={updatingId === order._id}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder.orderNumber || selectedOrder._id}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedOrder.user?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedOrder.user?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedOrder.user?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Order Date</p>
                    <p className="font-medium">
                      {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Items ({selectedOrder.items?.length || 0})
                </h3>
                <div className="space-y-3">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="bg-background p-3 rounded border border-border">
                      <p className="font-medium">{item.productName || item.product?.name || `Item ${idx + 1}`}</p>
                      {(() => {
                        const sel = item.selectedSize ?? item.product?.sizes?.[0];
                        if (!sel) return null;
                        return (
                          <p className="text-xs text-muted-foreground mt-1">
                            Size: {sel.size} ({sel.quantity}{sel.unit})
                          </p>
                        );
                      })()}

                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-muted-foreground">
                          Qty: {item.quantity} × ₹{(item.price || 0).toFixed(2)}
                        </span>
                        <span className="font-medium">₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Shipping Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedOrder.shippingAddress.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedOrder.shippingAddress.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">
                        {[
                          selectedOrder.shippingAddress.street,
                          selectedOrder.shippingAddress.address,
                        ]
                          .filter(Boolean)
                          .join(", ") || "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="font-medium">{selectedOrder.shippingAddress.city || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">State</p>
                        <p className="font-medium">{selectedOrder.shippingAddress.state || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">PIN Code</p>
                        <p className="font-medium">{selectedOrder.shippingAddress.pincode || selectedOrder.shippingAddress.zipCode || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-medium text-lg">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{selectedOrder.paymentMethod === "cod" ? "Cash on Delivery" : "Razorpay"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Status</p>
                    <Badge variant="outline">{selectedOrder.paymentStatus || "pending"}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Order Status</p>
                    <Badge variant="outline">{selectedOrder.orderStatus || "pending"}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}