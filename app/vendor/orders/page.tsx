"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Package, DollarSign, Calendar, Info } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Order {
  _id: string;
  orderNumber: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  items: any[];
  vendorSubtotal: number;
  vendorEarnings: number;
  payoutStatus: string;
  paymentStatus: string;
  orderStatus: string;
  cancellationReason?: string; // Added for vendor cancellations
  createdAt: string;
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/vendor/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, reason?: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "secondary",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
    };

    const colors: Record<string, string> = {
      pending: "text-orange-600 border-orange-600",
      processing: "text-blue-600 border-blue-600",
      shipped: "text-purple-600 border-purple-600",
      delivered: "text-green-600 border-green-600",
      cancelled: "text-white border-red-600",
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPayoutBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-orange-500">
            Pending
          </Badge>
        );
      case "released":
        return (
          <Badge variant="default" className="bg-green-500">
            Released
          </Badge>
        );
      case "held":
        return (
          <Badge variant="outline" className="text-gray-500">
            Held
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.user.name.toLowerCase().includes(search.toLowerCase()) ||
      order.user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Manage orders containing your products</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{orders.reduce((sum, order) => sum + order.vendorEarnings, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {orders
                .filter((o) => o.payoutStatus === "pending")
                .reduce((sum, order) => sum + order.vendorEarnings, 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o) => o.orderStatus === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search by order number, customer name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== "all"
                  ? "No orders found matching your filters"
                  : "No orders yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Your Earnings</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">#{order.orderNumber}</p>
                        {order.paymentStatus === "completed" && (
                          <Badge variant="outline" className="mt-1 text-xs text-green-600">
                            Paid
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.user.name}</p>
                        <p className="text-muted-foreground text-sm">{order.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.items.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="relative h-8 w-8">
                            {item.product?.image ? (
                              <Image
                                src={item.product.image}
                                alt={item.product.name}
                                width={32}
                                height={32}
                                className="rounded object-cover"
                              />
                            ) : (
                              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
                                <Package className="text-muted-foreground h-4 w-4" />
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-muted-foreground text-xs">
                            +{order.items.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-green-600">
                        ₹{order.vendorEarnings.toFixed(2)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        from ₹{order.vendorSubtotal.toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell>{getPayoutBadge(order.payoutStatus)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(order.orderStatus)}
                        {order.orderStatus === "cancelled" && order.cancellationReason && (
                          <div className="group relative">
                            <Info className="text-muted-foreground h-4 w-4 cursor-help" />
                            <div className="invisible absolute bottom-full left-1/2 z-10 mb-1 w-48 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:visible">
                              Cancellation reason: {order.cancellationReason}
                            </div>
                          </div>
                        )}
                      </div>
                      {order.orderStatus === "cancelled" && order.cancellationReason && (
                        <p className="mt-1 max-w-[150px] truncate text-xs text-red-500">
                          Reason: {order.cancellationReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/vendor/orders/${order._id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
