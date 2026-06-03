"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingBag,
  Package,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Receipt,
} from "lucide-react";

interface OrderItem {
  product?: {
    _id?: string;
    name?: string;
    image?: string;
    slug?: string;
  };
  quantity?: number;
  price?: number;
  shopName?: string;
  selectedSize?: {
    size: string;
    unit: string;
    quantity: number;
  };
}

interface Order {
  _id: string;
  orderNumber?: string;
  items?: OrderItem[];
  totalAmount?: number;
  orderStatus?: string;
  paymentStatus?: string;
  createdAt?: string;
  paymentMethod?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  processing: {
    label: "Processing",
    icon: Package,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  canceled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Payment Pending", color: "text-amber-600" },
  completed: { label: "Paid", color: "text-emerald-600" },
  failed: { label: "Payment Failed", color: "text-red-600" },
};

function StatusBadge({ status }: { status?: string }) {
  const key = (status ?? "pending").toLowerCase();
  const cfg = STATUS_CONFIG[key] ?? {
    label: status ?? "Unknown",
    icon: AlertCircle,
    color: "text-gray-700",
    bg: "bg-gray-50",
    border: "border-gray-200",
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function OrderSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-border bg-card animate-pulse rounded-2xl border p-5">
          <div className="mb-4 flex justify-between">
            <div className="space-y-2">
              <div className="bg-muted h-4 w-32 rounded-full" />
              <div className="bg-muted h-3 w-24 rounded-full" />
            </div>
            <div className="bg-muted h-6 w-20 rounded-full" />
          </div>
          <div className="flex gap-3">
            <div className="bg-muted h-16 w-16 flex-shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="bg-muted h-4 w-48 rounded-full" />
              <div className="bg-muted h-3 w-32 rounded-full" />
            </div>
            <div className="bg-muted h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/auth/login?callbackUrl=/profile/orders");
      return;
    }
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders?userOrders=true");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch orders");
      }
      const data = await res.json();
      // Handle both array and { orders: [] } response shapes
      const normalized = Array.isArray(data) ? data : (data.orders ?? []);
      setOrders(normalized);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="bg-background min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="mb-8">
            <div className="bg-muted mb-2 h-8 w-40 animate-pulse rounded-full" />
            <div className="bg-muted h-4 w-56 animate-pulse rounded-full" />
          </div>
          <OrderSkeleton />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => router.push("/profile")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-foreground text-2xl font-bold">My Orders</h1>
              <p className="text-muted-foreground text-sm">View and track all your orders</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-2"
            onClick={fetchOrders}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrders}
                className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="py-20 text-center">
            <div className="bg-primary/10 mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full">
              <ShoppingBag className="text-primary h-10 w-10" />
            </div>
            <h2 className="text-foreground mb-2 text-xl font-semibold">No orders yet</h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-sm">
              You haven't placed any orders yet. Start shopping to see your orders here.
            </p>
            <Link href="/products">
              <Button className="rounded-full px-8">Browse Products</Button>
            </Link>
          </div>
        )}

        {/* Orders list */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm font-medium">
              {orders.length} order{orders.length !== 1 ? "s" : ""} found
            </p>
            {orders.map((order) => {
              const items = order.items ?? [];
              const firstItem = items[0];
              const remainingCount = items.length - 1;
              const productImage = firstItem?.product?.image;
              const productName = firstItem?.product?.name ?? "Product";
              const createdAt = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—";
              const paymentCfg = PAYMENT_STATUS_CONFIG[
                (order.paymentStatus ?? "").toLowerCase()
              ] ?? { label: order.paymentStatus ?? "Unknown", color: "text-muted-foreground" };

              return (
                <Link key={order._id} href={`/profile/orders/${order._id}`}>
                  <Card className="group hover:border-primary/30 border-border cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md">
                    <CardContent className="p-0">
                      {/* Top bar */}
                      <div className="border-border bg-muted/30 flex items-center justify-between border-b px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Receipt className="text-muted-foreground h-4 w-4" />
                          <div>
                            <span className="text-foreground text-xs font-semibold">
                              #{order.orderNumber ?? order._id.slice(-8).toUpperCase()}
                            </span>
                            <span className="text-muted-foreground ml-2 text-xs">{createdAt}</span>
                          </div>
                        </div>
                        <StatusBadge status={order.orderStatus} />
                      </div>

                      {/* Item preview */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        {/* Product image */}
                        <div className="relative flex-shrink-0">
                          {productImage ? (
                            <div className="border-border relative h-16 w-16 overflow-hidden rounded-xl border">
                              <Image
                                src={productImage}
                                alt={productName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="bg-muted border-border flex h-16 w-16 items-center justify-center rounded-xl border">
                              <Package className="text-muted-foreground h-6 w-6" />
                            </div>
                          )}
                          {items.length > 1 && (
                            <div className="bg-primary text-primary-foreground absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                              {items.length}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm font-semibold">
                            {productName}
                          </p>
                          {remainingCount > 0 && (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              +{remainingCount} more item{remainingCount !== 1 ? "s" : ""}
                            </p>
                          )}
                          {firstItem?.selectedSize && (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {firstItem.selectedSize.size} · {firstItem.selectedSize.quantity}
                              {firstItem.selectedSize.unit}
                            </p>
                          )}
                          <p className={`mt-1 text-xs font-medium ${paymentCfg.color}`}>
                            {paymentCfg.label}
                            {order.paymentMethod && (
                              <span className="text-muted-foreground ml-1 font-normal">
                                via {order.paymentMethod.toUpperCase()}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Amount + arrow */}
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <div className="text-right">
                            <p className="text-foreground font-bold">
                              ₹{Number(order.totalAmount ?? 0).toLocaleString("en-IN")}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {items.length} item{items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <ChevronRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
