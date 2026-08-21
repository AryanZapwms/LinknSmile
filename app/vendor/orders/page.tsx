"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import { formatCurrency } from "@/lib/currency";

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
  const t = useTranslations("VendorOrdersPage");
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
      toast.error(t("loadFailed"));
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

    const labels: Record<string, string> = {
      pending: t("statusPending"),
      processing: t("statusProcessing"),
      shipped: t("statusShipped"),
      delivered: t("statusDelivered"),
      cancelled: t("statusCancelled"),
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPayoutBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-orange-500">
            {t("payoutPending")}
          </Badge>
        );
      case "released":
        return (
          <Badge variant="default" className="bg-green-500">
            {t("payoutReleased")}
          </Badge>
        );
      case "held":
        return (
          <Badge variant="outline" className="text-gray-500">
            {t("payoutHeld")}
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
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalOrders")}</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalEarnings")}</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(orders.reduce((sum, order) => sum + order.vendorEarnings, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingPayouts")}</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                orders
                  .filter((o) => o.payoutStatus === "pending")
                  .reduce((sum, order) => sum + order.vendorEarnings, 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingOrders")}</CardTitle>
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
          <CardTitle>{t("filterOrders")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 start-2.5 h-4 w-4" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t("filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatus")}</SelectItem>
                <SelectItem value="pending">{t("statusPending")}</SelectItem>
                <SelectItem value="processing">{t("statusProcessing")}</SelectItem>
                <SelectItem value="shipped">{t("statusShipped")}</SelectItem>
                <SelectItem value="delivered">{t("statusDelivered")}</SelectItem>
                <SelectItem value="cancelled">{t("statusCancelled")}</SelectItem>
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
                {search || statusFilter !== "all" ? t("noOrdersFilterMsg") : t("noOrdersYet")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colOrder")}</TableHead>
                  <TableHead>{t("colCustomer")}</TableHead>
                  <TableHead>{t("colItems")}</TableHead>
                  <TableHead>{t("colYourEarnings")}</TableHead>
                  <TableHead>{t("colPayout")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colDate")}</TableHead>
                  <TableHead className="text-end">{t("colActions")}</TableHead>
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
                            {t("paid")}
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
                        {formatCurrency(order.vendorEarnings)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("fromLabel", { amount: formatCurrency(order.vendorSubtotal) })}
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
                              {t("cancellationReasonTooltip", { reason: order.cancellationReason })}
                            </div>
                          </div>
                        )}
                      </div>
                      {order.orderStatus === "cancelled" && order.cancellationReason && (
                        <p className="mt-1 max-w-[150px] truncate text-xs text-red-500">
                          {t("reasonLabel", { reason: order.cancellationReason })}
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
                    <TableCell className="text-end">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/vendor/orders/${order._id}`}>
                          <Eye className="me-2 h-4 w-4" />
                          {t("view")}
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
