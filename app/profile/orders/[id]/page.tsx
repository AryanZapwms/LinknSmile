"use client"

import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, Circle, CircleX, CreditCard, MapPin, Package, Truck } from "lucide-react"

const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
const numberFormatter = new Intl.NumberFormat("en-IN")

const statusLabelMap: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  canceled: "Cancelled",
}

const statusSteps = [
  { key: "pending", label: "Pending", description: "Order received successfully." },
  { key: "processing", label: "Processing", description: "Your items are being prepared." },
  { key: "shipped", label: "Shipped", description: "Package has left the warehouse." },
  { key: "delivered", label: "Delivered", description: "Order delivered to your address." },
]

const getStatusBadgeColor = (status?: string) => {
  if (!status) return "bg-gray-100 text-gray-800"
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "processing":
      return "bg-blue-100 text-blue-800"
    case "shipped":
      return "bg-purple-100 text-purple-800"
    case "delivered":
      return "bg-green-100 text-green-800"
    case "cancelled":
    case "canceled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

interface ShippingAddress {
  name?: string
  phone?: string
  street?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  pincode?: string
  country?: string
}

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

interface OrderDetail {
  _id: string
  orderNumber?: string
  items: OrderItem[]
  totalAmount: number
  orderStatus?: string
  paymentStatus?: string
  paymentMethod?: string
  createdAt?: string
  updatedAt?: string
  shippingAddress?: ShippingAddress
  razorpayOrderId?: string
  razorpayPaymentId?: string
}

export default function OrderDetailsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const orderId = params?.id ?? ""
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError("Order not found")
      setOrder(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) {
        throw new Error("Failed to fetch order details")
      }

      const data: Record<string, any> = await res.json()
      const normalizedItems: OrderItem[] = Array.isArray(data.items)
        ? data.items.map((item: Record<string, any>) => {
            const product = item.product ?? undefined
            const productCompany = product?.company && typeof product.company === "object" ? product.company : undefined
            return {
              product: productCompany ? { ...product, company: productCompany } : product,
              productId: product?._id?.toString?.() ?? item.productId?.toString?.(),
              productName: product?.name ?? item.productName,
              quantity: Number(item.quantity ?? 0),
              price: Number(item.price ?? 0),
            }
          })
        : []

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
      }

      setOrder(normalized)
    } catch (fetchError: any) {
      console.error("Error fetching order detail:", fetchError)
      setOrder(null)
      setError(fetchError?.message ?? "Failed to fetch order details")
    } finally {
      setLoading(false)
    }
  }, [orderId])

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

    fetchOrder()
  }, [status, session, router, fetchOrder])

  const statusInfo = useMemo(() => {
    if (!order?.orderStatus) {
      return {
        label: "Unknown",
        normalized: "",
        steps: statusSteps.map((step) => ({ ...step, completed: false, current: false, reached: false })),
        cancelled: false,
      }
    }

    const normalized = order.orderStatus.toLowerCase()
    const cancelled = normalized === "cancelled" || normalized === "canceled"
    const activeIndex = cancelled ? -1 : statusSteps.findIndex((step) => step.key === normalized)

    return {
      label: statusLabelMap[normalized] ?? order.orderStatus,
      normalized,
      steps: statusSteps.map((step, index) => {
        const reached = activeIndex !== -1 && index <= activeIndex
        const current = activeIndex !== -1 && index === activeIndex
        const completed = activeIndex !== -1 && index < activeIndex
        return {
          ...step,
          reached,
          current,
          completed,
        }
      }),
      cancelled,
    }
  }, [order])

  const itemCount = useMemo(() => {
    if (!order?.items?.length) return 0
    return order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
  }, [order])

  const itemsSubtotal = useMemo(() => {
    if (!order?.items?.length) return 0
    return order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.price ?? 0), 0)
  }, [order])

  const createdAt = order?.createdAt ? new Date(order.createdAt) : null
  const updatedAt = order?.updatedAt ? new Date(order.updatedAt) : null

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading order details...</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading order details...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-red-600 font-medium">{error}</p>
              <Button onClick={fetchOrder}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Order not found.</p>
      </main>
    )
  }

  const statusBadge = getStatusBadgeColor(order.orderStatus)
  const statusLabel = statusInfo.label

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => router.push("/profile/orders") } className="w-full sm:w-auto justify-start">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <Badge className={`${statusBadge} px-3 py-1 text-sm`}>{statusLabel}</Badge>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Order #{order.orderNumber ?? order._id}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Placed on {createdAt ? createdAt.toLocaleString() : "—"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Last updated {updatedAt ? updatedAt.toLocaleString() : "—"}</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Package className="h-4 w-4 text-primary" />
                  Items
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{numberFormatter.format(itemCount)}</p>
                <p className="text-xs text-muted-foreground">Subtotal {currencyFormatter.format(itemsSubtotal)}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Payment
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{currencyFormatter.format(order.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {(order.paymentStatus ?? "Unknown").toUpperCase()} · {order.paymentMethod?.toUpperCase() ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Truck className="h-4 w-4 text-primary" />
                  Status
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">{statusLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Reference {order.razorpayOrderId ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {statusInfo.steps.map((step) => {
                const stateClass = step.current
                  ? "border-primary bg-primary/5"
                  : step.reached
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-border"
                return (
                  <div key={step.key} className={`rounded-lg border p-3 ${stateClass}`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {step.current ? (
                        <Circle className="h-4 w-4 text-primary" />
                      ) : step.reached ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      {step.label}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  </div>
                )
              })}
              {statusInfo.cancelled ? (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                    <CircleX className="h-4 w-4" />
                    Cancelled
                  </div>
                  <p className="text-xs text-red-500 mt-1">This order was cancelled.</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.length ? (
              order.items.map((item, idx) => {
                const quantity = Number(item.quantity ?? 0)
                const price = Number(item.price ?? 0)
                const subtotal = quantity * price
                const productName = item.productName ?? item.product?.name ?? `Item ${idx + 1}`
                const productImage = item.product?.image
                const companyName = item.product?.company && typeof item.product.company === "object" ? item.product.company.name : undefined
                const companySlug = item.product?.company && typeof item.product.company === "object" ? item.product.company.slug : undefined
                const productSlug = item.product?.slug
                const productHref = productSlug && companySlug ? `/shop/${companySlug}/product/${productSlug}` : undefined

                return (
                  <div key={`${item.productId ?? idx}-${idx}`} className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
                    {productImage ? (
                      <Image src={productImage} alt={productName} width={80} height={80} className="h-20 w-20 rounded-md object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-md bg-muted" />
                    )}
                    <div className="flex-1 space-y-1">
                      {productHref ? (
                        <Link href={productHref} className="text-sm font-semibold text-foreground hover:underline">
                          {productName}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-foreground">{productName}</p>
                      )}
                      {companyName ? <p className="text-xs text-muted-foreground">{companyName}</p> : null}
                      {item.selectedSize && (
                        <p className="text-xs text-muted-foreground">
                          Size: {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Quantity {numberFormatter.format(quantity)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{currencyFormatter.format(price)}</p>
                      <p className="text-xs text-muted-foreground">Subtotal {currencyFormatter.format(subtotal)}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">No items available for this order.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.shippingAddress ? (
                <div className="space-y-2 text-sm">
                  {order.shippingAddress.name ? (
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {order.shippingAddress.name}
                    </p>
                  ) : null}
                  {order.shippingAddress.phone ? (
                    <p className="text-muted-foreground">Phone {order.shippingAddress.phone}</p>
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
                      {[order.shippingAddress.pincode ?? order.shippingAddress.zipCode, order.shippingAddress.country]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No shipping address available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment status</span>
                <Badge variant="outline">{order.paymentStatus ?? "Unknown"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment method</span>
                <span className="font-medium text-foreground">{order.paymentMethod?.toUpperCase() ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-medium text-foreground">{order.razorpayPaymentId ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order total</span>
                <span className="font-semibold text-foreground">{currencyFormatter.format(order.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
