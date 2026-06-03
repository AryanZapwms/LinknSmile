"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, MapPin, CreditCard, Package } from "lucide-react";

interface OrderItem {
  product?: {
    _id?: string;
    name?: string;
    sizes?: Array<{
      size: string;
      unit: string;
      quantity: number;
      price: number;
      discountPrice?: number;
    }>;
  };
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  selectedSize?: {
    size: string;
    unit: string;
    quantity: number;
    price: number;
    discountPrice?: number;
  };
}

interface ShippingAddress {
  name?: string;
  phone?: string;
  street?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  zipCode?: string;
  country?: string;
}

interface Order {
  _id: string;
  orderNumber?: string;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
  orderStatus?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt?: string;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push("/auth/login");
      return;
    }

    if ((session.user as any)?.role !== "admin") {
      router.push("/");
      return;
    }

    fetchOrders();
  }, [session, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update order");
      await fetchOrders();

      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
      }
    } catch (error) {
      console.error("Error updating order:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update payment status");
      await fetchOrders();

      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: newStatus });
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading orders...</p>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-foreground mb-8 text-3xl font-bold">Orders Management</h1>

        <Card>
          <CardHeader>
            <CardTitle>All Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">No orders found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="px-4 py-3 text-left font-semibold">Order ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold">Items</th>
                      <th className="px-4 py-3 text-left font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold">Payment</th>
                      <th className="px-4 py-3 text-left font-semibold">Method</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-border hover:bg-muted/50 border-b">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">
                          {order.orderNumber || order._id.slice(-6)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{order.user?.name || "Unknown"}</p>
                            <p className="text-muted-foreground text-xs">{order.user?.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant="outline">{order.items?.length || 0} items</Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          ₹{(order.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={order.paymentStatus || "pending"}
                            onValueChange={(value) => updatePaymentStatus(order._id, value)}
                            disabled={updatingId === order._id}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={order.paymentMethod === "cod" ? "secondary" : "default"}>
                            {order.paymentMethod === "cod" ? "COD" : "Razorpay"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={order.orderStatus || "pending"}
                            onValueChange={(value) => updateOrderStatus(order._id, value)}
                            disabled={updatingId === order._id}
                          >
                            <SelectTrigger className="h-8 w-32">
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
                        <td className="text-muted-foreground px-4 py-3 text-xs">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
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
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Order Details - {selectedOrder.orderNumber || selectedOrder._id}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="mb-3 font-semibold">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Name</p>
                    <p className="font-medium">{selectedOrder.user?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="font-medium">{selectedOrder.user?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <p className="font-medium">{selectedOrder.user?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Order Date</p>
                    <p className="font-medium">
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Package className="h-4 w-4" />
                  Items ({selectedOrder.items?.length || 0})
                </h3>
                <div className="space-y-3">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="bg-background border-border rounded border p-3">
                      <p className="font-medium">
                        {item.productName || item.product?.name || `Item ${idx + 1}`}
                      </p>
                      {(() => {
                        const sel = item.selectedSize ?? item.product?.sizes?.[0];
                        if (!sel) return null;
                        return (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Size: {sel.size} ({sel.quantity}
                            {sel.unit})
                          </p>
                        );
                      })()}

                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Qty: {item.quantity} × ₹{(item.price || 0).toFixed(2)}
                        </span>
                        <span className="font-medium">
                          ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Name</p>
                      <p className="font-medium">{selectedOrder.shippingAddress.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Phone</p>
                      <p className="font-medium">{selectedOrder.shippingAddress.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Address</p>
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
                        <p className="text-muted-foreground text-xs">City</p>
                        <p className="font-medium">{selectedOrder.shippingAddress.city || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">State</p>
                        <p className="font-medium">
                          {selectedOrder.shippingAddress.state || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">PIN Code</p>
                        <p className="font-medium">
                          {selectedOrder.shippingAddress.pincode ||
                            selectedOrder.shippingAddress.zipCode ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <CreditCard className="h-4 w-4" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Amount</p>
                    <p className="text-lg font-medium">
                      ₹{(selectedOrder.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Payment Method</p>
                    <p className="font-medium">
                      {selectedOrder.paymentMethod === "cod" ? "Cash on Delivery" : "Razorpay"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Payment Status</p>
                    <Badge variant="outline">{selectedOrder.paymentStatus || "pending"}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Order Status</p>
                    <Badge variant="outline">{selectedOrder.orderStatus || "pending"}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
