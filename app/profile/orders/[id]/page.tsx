"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  CircleX,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency, LOCALE } from "@/lib/currency";

const numberFormatter = new Intl.NumberFormat(LOCALE);

type DetailTranslator = ReturnType<typeof useTranslations<"ProfileOrderDetailPage">>;

function getStatusLabelMap(t: DetailTranslator): Record<string, string> {
  return {
    pending: t("stepPendingLabel"),
    processing: t("stepProcessingLabel"),
    shipped: t("stepShippedLabel"),
    delivered: t("stepDeliveredLabel"),
    cancelled: t("cancelledLabel"),
    canceled: t("cancelledLabel"),
  };
}

function getStatusSteps(t: DetailTranslator) {
  return [
    { key: "pending", label: t("stepPendingLabel"), description: t("stepPendingDesc") },
    { key: "processing", label: t("stepProcessingLabel"), description: t("stepProcessingDesc") },
    { key: "shipped", label: t("stepShippedLabel"), description: t("stepShippedDesc") },
    { key: "delivered", label: t("stepDeliveredLabel"), description: t("stepDeliveredDesc") },
  ];
}

const getStatusBadgeColor = (status?: string) => {
  if (!status) return "bg-gray-100 text-gray-800";
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "shipped":
      return "bg-purple-100 text-purple-800";
    case "delivered":
      return "bg-green-100 text-green-800";
    case "cancelled":
    case "canceled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

interface ShippingAddress {
  name?: string;
  phone?: string;
  street?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  pincode?: string;
  country?: string;
}

interface OrderItem {
  product?: {
    _id?: string;
    name?: string;
    slug?: string;
    image?: string;
    company?: { slug?: string; name?: string };
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

interface OrderDetail {
  _id: string;
  orderNumber?: string;
  items: OrderItem[];
  totalAmount: number;
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  shippingAddress?: ShippingAddress;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

export default function OrderDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";
  const t = useTranslations("ProfileOrderDetailPage");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError(t("orderNotFound"));
      setOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        throw new Error(t("loadError"));
      }

      const data: Record<string, any> = await res.json();
      const normalizedItems: OrderItem[] = Array.isArray(data.items)
        ? data.items.map((item: Record<string, any>) => {
            const product = item.product ?? undefined;
            const productCompany =
              product?.company && typeof product.company === "object" ? product.company : undefined;
            return {
              product: productCompany ? { ...product, company: productCompany } : product,
              productId: product?._id?.toString?.() ?? item.productId?.toString?.(),
              productName: product?.name ?? item.productName,
              quantity: Number(item.quantity ?? 0),
              price: Number(item.price ?? 0),
            };
          })
        : [];

      const normalized: OrderDetail = {
        _id: data._id,
        orderNumber: data.orderNumber,
        items: normalizedItems,
        totalAmount: Number(data.totalAmount ?? 0),
        orderStatus: data.orderStatus ?? data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        shippingAddress: data.shippingAddress,
        razorpayOrderId: data.razorpayOrderId,
        razorpayPaymentId: data.razorpayPaymentId,
      };

      setOrder(normalized);
    } catch (fetchError: any) {
      console.error("Error fetching order detail:", fetchError);
      setOrder(null);
      setError(fetchError?.message ?? t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }

    if (!session) {
      return;
    }

    fetchOrder();
  }, [status, session, router, fetchOrder]);

  const statusInfo = useMemo(() => {
    const statusSteps = getStatusSteps(t);
    if (!order?.orderStatus) {
      return {
        label: t("unknownLabel"),
        normalized: "",
        steps: statusSteps.map((step) => ({
          ...step,
          completed: false,
          current: false,
          reached: false,
        })),
        cancelled: false,
      };
    }

    const normalized = order.orderStatus.toLowerCase();
    const cancelled = normalized === "cancelled" || normalized === "canceled";
    const activeIndex = cancelled ? -1 : statusSteps.findIndex((step) => step.key === normalized);

    return {
      label: getStatusLabelMap(t)[normalized] ?? order.orderStatus,
      normalized,
      steps: statusSteps.map((step, index) => {
        const reached = activeIndex !== -1 && index <= activeIndex;
        const current = activeIndex !== -1 && index === activeIndex;
        const completed = activeIndex !== -1 && index < activeIndex;
        return {
          ...step,
          reached,
          current,
          completed,
        };
      }),
      cancelled,
    };
  }, [order, t]);

  const itemCount = useMemo(() => {
    if (!order?.items?.length) return 0;
    return order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  }, [order]);

  const itemsSubtotal = useMemo(() => {
    if (!order?.items?.length) return 0;
    return order.items.reduce(
      (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.price ?? 0),
      0
    );
  }, [order]);

  const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
  const updatedAt = order?.updatedAt ? new Date(order.updatedAt) : null;

  if (status === "loading") {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("loadingOrderDetails")}</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (loading) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("loadingOrderDetails")}</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="space-y-4 py-8 text-center">
              <p className="font-medium text-red-600">{error}</p>
              <Button onClick={fetchOrder}>{t("retry")}</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("orderNotFound")}</p>
      </main>
    );
  }

  const statusBadge = getStatusBadgeColor(order.orderStatus);
  const statusLabel = statusInfo.label;

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/profile/orders")}
            className="w-full justify-start sm:w-auto"
          >
            <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
            {t("backToOrders")}
          </Button>
          <Badge className={`${statusBadge} px-3 py-1 text-sm`}>{statusLabel}</Badge>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("orderNumberLabel", { number: order.orderNumber ?? order._id })}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {t("placedOn", { date: createdAt ? createdAt.toLocaleString() : "—" })}
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("lastUpdated", { date: updatedAt ? updatedAt.toLocaleString() : "—" })}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border-border rounded-lg border p-4">
                <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <Package className="text-primary h-4 w-4" />
                  {t("itemsCardLabel")}
                </div>
                <p className="text-foreground mt-2 text-2xl font-bold">
                  {numberFormatter.format(itemCount)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("subtotalLabel", { amount: formatCurrency(itemsSubtotal) })}
                </p>
              </div>
              <div className="border-border rounded-lg border p-4">
                <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="text-primary h-4 w-4" />
                  {t("paymentCardLabel")}
                </div>
                <p className="text-foreground mt-2 text-2xl font-bold">
                  {formatCurrency(order.totalAmount)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {(order.paymentStatus ?? t("unknownLabel")).toUpperCase()} ·{" "}
                  {order.paymentMethod?.toUpperCase() ?? "—"}
                </p>
              </div>
              <div className="border-border rounded-lg border p-4">
                <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <Truck className="text-primary h-4 w-4" />
                  {t("statusCardLabel")}
                </div>
                <p className="text-foreground mt-2 text-lg font-semibold">{statusLabel}</p>
                <p className="text-muted-foreground text-xs">
                  {t("referenceLabel", { ref: order.razorpayOrderId ?? "—" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("deliveryProgressTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {statusInfo.steps.map((step) => {
                const stateClass = step.current
                  ? "border-primary bg-primary/5"
                  : step.reached
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-border";
                return (
                  <div key={step.key} className={`rounded-lg border p-3 ${stateClass}`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {step.current ? (
                        <Circle className="text-primary h-4 w-4" />
                      ) : step.reached ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="text-muted-foreground h-4 w-4" />
                      )}
                      {step.label}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">{step.description}</p>
                  </div>
                );
              })}
              {statusInfo.cancelled ? (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                  <div className="flex items-center gap-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-1.5">
                    <CircleX className="h-4 w-4" />
                    {t("cancelledLabel")}
                  </div>
                  <p className="mt-1 text-xs text-red-500">{t("cancelledBody")}</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("itemsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.length ? (
              order.items.map((item, idx) => {
                const quantity = Number(item.quantity ?? 0);
                const price = Number(item.price ?? 0);
                const subtotal = quantity * price;
                const productName =
                  item.productName ?? item.product?.name ?? t("itemFallback", { number: idx + 1 });
                const productImage = item.product?.image;
                const companyName =
                  item.product?.company && typeof item.product.company === "object"
                    ? item.product.company.name
                    : undefined;
                const companySlug =
                  item.product?.company && typeof item.product.company === "object"
                    ? item.product.company.slug
                    : undefined;
                const productSlug = item.product?.slug;
                const productHref =
                  productSlug && companySlug
                    ? `/shop/${companySlug}/product/${productSlug}`
                    : undefined;

                return (
                  <div
                    key={`${item.productId ?? idx}-${idx}`}
                    className="border-border flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
                  >
                    {productImage ? (
                      <Image
                        src={productImage}
                        alt={productName}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-muted h-20 w-20 rounded-md" />
                    )}
                    <div className="flex-1 space-y-1">
                      {productHref ? (
                        <Link
                          href={productHref}
                          className="text-foreground text-sm font-semibold hover:underline"
                        >
                          {productName}
                        </Link>
                      ) : (
                        <p className="text-foreground text-sm font-semibold">{productName}</p>
                      )}
                      {companyName ? (
                        <p className="text-muted-foreground text-xs">{companyName}</p>
                      ) : null}
                      {item.selectedSize && (
                        <p className="text-muted-foreground text-xs">
                          {t("sizeLabel", {
                            size: item.selectedSize.size,
                            quantity: item.selectedSize.quantity,
                            unit: item.selectedSize.unit,
                          })}
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {t("quantityLabel", { quantity: numberFormatter.format(quantity) })}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-foreground text-sm font-semibold">
                        {formatCurrency(price)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("subtotalLabel", { amount: formatCurrency(subtotal) })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm">{t("noItems")}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("shippingAddressTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.shippingAddress ? (
                <div className="space-y-2 text-sm">
                  {order.shippingAddress.name ? (
                    <p className="text-foreground flex items-center gap-2 font-semibold">
                      <MapPin className="text-primary h-4 w-4" />
                      {order.shippingAddress.name}
                    </p>
                  ) : null}
                  {order.shippingAddress.phone ? (
                    <p className="text-muted-foreground">
                      {t("phoneLabel", { phone: order.shippingAddress.phone })}
                    </p>
                  ) : null}
                  <div className="text-muted-foreground space-y-1">
                    {[order.shippingAddress.street, order.shippingAddress.address]
                      .filter(Boolean)
                      .map((line, lineIdx) => (
                        <p key={`addr-line-${lineIdx}`}>{line}</p>
                      ))}
                    <p>
                      {[order.shippingAddress.city, order.shippingAddress.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p>
                      {[
                        order.shippingAddress.pincode ?? order.shippingAddress.zipCode,
                        order.shippingAddress.country,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t("noShippingAddress")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("paymentDetailsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("paymentStatusLabel")}</span>
                <Badge variant="outline">{order.paymentStatus ?? t("unknownLabel")}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("paymentMethodLabel")}</span>
                <span className="text-foreground font-medium">
                  {order.paymentMethod?.toUpperCase() ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("transactionIdLabel")}</span>
                <span className="text-foreground font-medium">
                  {order.razorpayPaymentId ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("orderTotalLabel")}</span>
                <span className="text-foreground font-semibold">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
