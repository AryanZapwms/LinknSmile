"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

interface Stats {
  totalProducts: number;
  pendingApproval: number;
  approvedProducts: number;
  rejectedProducts: number;
  totalOrders: number;
  totalEarnings: number;
  pendingPayouts: number;
}

interface Shop {
  name: string;
  isApproved: boolean;
  isActive: boolean;
  commissionRate: number;
  ratings: {
    average: number;
    count: number;
  };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function VendorDashboard() {
  const t = useTranslations("VendorDashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankDetailsComplete, setBankDetailsComplete] = useState<boolean | null>(null);

  useEffect(() => {
    fetchStats();
    fetchBankStatus();
  }, []);

  const fetchBankStatus = async () => {
    try {
      const res = await fetch("/api/vendor/bank-details");
      if (res.ok) {
        const data = await res.json();
        setBankDetailsComplete(data.isComplete ?? false);
      }
    } catch {
      // non-critical — silently ignore
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/vendor/stats");
      const data = await res.json();

      if (data.success) {
        setStats(data.stats);
        setShop(data.shop);
        setRecentOrders(data.recentOrders || []);
      } else {
        setError(data.message || t("loadFailedGeneric"));
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setError(t("loadFailedUnexpected"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !shop || !stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error")}</AlertTitle>
        <AlertDescription>{error || t("loadFailedGeneric")}</AlertDescription>
      </Alert>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "secondary",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      pending: t("statusPending"),
      processing: t("statusProcessing"),
      shipped: t("statusShipped"),
      delivered: t("statusDelivered"),
      cancelled: t("statusCancelled"),
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("welcomeBack", { name: shop.name })}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* ── Bank details missing banner ────────────────────────────── */}
      {bankDetailsComplete === false && (
        <Alert className="border-amber-300 bg-amber-50">
          <CreditCard className="h-4 w-4 text-amber-600" />
          <AlertTitle className="font-semibold text-amber-900">
            {t("bankDetailsBannerTitle")}
          </AlertTitle>
          <AlertDescription className="mt-1 flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center">
            <span className="flex-1">{t("bankDetailsBannerDesc")}</span>
            <Button
              asChild
              size="sm"
              className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
            >
              <Link href="/vendor/bank-details">{t("addBankDetails")}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Shop Status Alert */}
      {!shop.isApproved && (
        <Alert className="border-orange-200 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">{t("shopPendingTitle")}</AlertTitle>
          <AlertDescription className="text-orange-700">{t("shopPendingDesc")}</AlertDescription>
        </Alert>
      )}

      {!shop.isActive && shop.isApproved && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("shopInactiveTitle")}</AlertTitle>
          <AlertDescription>{t("shopInactiveDesc")}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalProducts")}</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                {t("approvedCount", { count: stats.approvedProducts })}
              </span>
              <span className="flex items-center gap-1 text-purple-600">
                <Clock className="h-3 w-3" />
                {t("pendingCount", { count: stats.pendingApproval })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalOrders")}</CardTitle>
            <ShoppingCart className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("allTimeOrders")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalEarnings")}</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("afterCommission", { rate: shop.commissionRate })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingPayouts")}</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingPayouts)}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("availableToWithdraw")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Shop Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("shopInformation")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t("status")}</p>
            <div className="mt-1 flex gap-2">
              {shop.isApproved ? (
                <Badge variant="default" className="bg-purple-500">
                  <CheckCircle className="me-1 h-3 w-3" />
                  {t("approved")}
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Clock className="me-1 h-3 w-3" />
                  {t("pending")}
                </Badge>
              )}
              {shop.isActive ? (
                <Badge variant="default">{t("active")}</Badge>
              ) : (
                <Badge variant="destructive">{t("inactive")}</Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t("commissionRate")}</p>
            <p className="mt-1 text-2xl font-bold">{shop.commissionRate}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t("shopRating")}</p>
            <div className="mt-1 flex items-center gap-1">
              <p className="text-2xl font-bold">{shop.ratings.average.toFixed(1)}</p>
              <p className="text-muted-foreground text-sm">
                {t("reviewsCount", { count: shop.ratings.count })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("recentOrders")}</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vendor/orders">{t("viewAll")}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">{t("noOrdersYet")}</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div>
                    <p className="font-medium">#{order.orderNumber}</p>
                    <p className="text-muted-foreground text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-end">
                    <div>
                      <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                      {getStatusBadge(order.status)}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/vendor/orders/${order.id}`}>{t("view")}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className={`transition-shadow ${!shop.isApproved ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:shadow-lg"}`}
        >
          <Link
            href={shop.isApproved ? "/vendor/products/add" : "#"}
            onClick={(e) => !shop.isApproved && e.preventDefault()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("addNewProduct")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{t("addNewProductDesc")}</p>
            </CardContent>
          </Link>
        </Card>

        <Card
          className={`transition-shadow ${!shop.isApproved ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:shadow-lg"}`}
        >
          <Link
            href={shop.isApproved ? "/vendor/products" : "#"}
            onClick={(e) => !shop.isApproved && e.preventDefault()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("manageProducts")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{t("manageProductsDesc")}</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <Link href="/vendor/payouts">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t("requestPayout")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{t("requestPayoutDesc")}</p>
            </CardContent>
          </Link>
        </Card>

        <Card
          className={`cursor-pointer transition-shadow hover:shadow-lg ${
            bankDetailsComplete === false ? "ring-2 ring-amber-400 ring-offset-1" : ""
          }`}
        >
          <Link href="/vendor/bank-details">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("bankDetails")}
                {bankDetailsComplete === false && (
                  <span className="ms-auto rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-normal text-amber-600">
                    {t("incomplete")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {bankDetailsComplete ? t("managePayoutAccount") : t("requiredForPayouts")}
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
