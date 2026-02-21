"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts"
import {
  ArrowDown,
  ArrowUp,
  MonitorDot,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"

type AnalyticsResponse = {
  overview: {
    totalOrders: number
    totalRevenue: number
    totalProducts: number
    totalUsers: number
  }
  filters: {
    startDate: string
    endDate: string
  }
  revenueByMonth: Array<{ date: string; revenue: number; orders: number }>
  topProducts: Array<{
    id: string
    name: string
    slug?: string
    image?: string
    unitsSold: number
    revenue: number
    growth: number | null
    averageRating: number | null
    reviewCount: number
  }>
  categoryPerformance: Array<{
    categoryName: string
    revenue: number
    orders: number
    units: number
  }>
  recentOrders: Array<{
    _id: string
    orderNumber: string
    totalAmount: number
    paymentStatus: string
    createdAt: string
    user?: { name?: string }
  }>
  orderStatusBreakdown: Array<{ _id: string; count: number }>
  paymentStatusBreakdown: Array<{ _id: string; count: number }>
  topCustomers: Array<{ userId: string; name: string; email: string; totalRevenue: number; totalOrders: number }>
  customerAnalytics: {
    newCustomers: number
    returningCustomers: number
    averageOrderValue: number
    previousAverageOrderValue: number
    averageOrderValueChange: number | null
    highValueCustomers: number
    averageClv: number
  }
  paymentAnalytics: Array<{ method: string; orders: number; revenue: number; averageOrderValue: number; successRate: number }>
  timeAnalytics: {
    hourly: Array<{ hour: number; orders: number; revenue: number }>
    weekday: Array<{ weekday: number; orders: number; revenue: number }>
  }
  geography: {
    totalOrders: number
    totalRevenue: number
    states: Array<{
      state: string
      orders: number
      revenue: number
      cities: Array<{ city: string; orders: number; revenue: number }>
    }>
    topCities: Array<{ city: string; state: string; orders: number; revenue: number }>
  }
  inventory: {
    summary: {
      inStock: number
      inStockValue: number
      lowStock: number
      lowStockValue: number
      outOfStock: number
      outOfStockValue: number
      overStock: number
      overStockValue: number
    }
    attention: Array<{ id: string; name: string; stock: number; price: number; slug?: string; image?: string }>
  }
  customerSatisfaction: {
    overallRating: number
    totalReviews: number
    recentFeedback: Array<{
      id: string
      rating: number
      comment: string
      userName?: string
      createdAt: string
      product: { id: string; name: string }
    }>
  }
  customerRangeStats: Array<{ userId: string; orders: number; revenue: number }>
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat("en-IN")

export default function AdminDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangePreset, setRangePreset] = useState("3m")
  const [customRange, setCustomRange] = useState<DateRange | undefined>()

  const presetOptions = [
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "3M", value: "3m" },
    { label: "6M", value: "6m" },
    { label: "1Y", value: "1y" },
    { label: "Custom", value: "custom" },
  ]

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

    const shouldFetchCustom = rangePreset === "custom"
    if (shouldFetchCustom && (!customRange?.from || !customRange?.to)) {
      return
    }

    const controller = new AbortController()
    const fetchAnalytics = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set("range", rangePreset)
        if (rangePreset === "custom" && customRange?.from && customRange?.to) {
          params.set("start", customRange.from.toISOString())
          params.set("end", customRange.to.toISOString())
        }
        const response = await fetch(`/api/admin/analytics?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("Failed to fetch analytics")
        }
        const data = (await response.json()) as AnalyticsResponse
        setAnalytics(data)
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError("Unable to load analytics")
          // console.error(fetchError) 
          setAnalytics(null)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    return () => controller.abort()
  }, [session, router, rangePreset, customRange?.from, customRange?.to])

  const dateRangeLabel = useMemo(() => {
    if (!analytics) {
      return ""
    }
    try {
      const start = format(new Date(analytics.filters.startDate), "dd MMM yyyy")
      const end = format(new Date(analytics.filters.endDate), "dd MMM yyyy")
      return `${start} - ${end}`
    } catch (rangeError) {
      return ""
    }
  }, [analytics])

  const revenueChartData = useMemo(() => {
    if (!analytics) {
      return []
    }
    return [...analytics.revenueByMonth]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({
        name: format(new Date(item.date), "MMM yyyy"),
        revenue: item.revenue,
        orders: item.orders,
      }))
  }, [analytics])

  const topCategories = useMemo(() => analytics?.categoryPerformance.slice(0, 8) ?? [], [analytics])

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading admin...</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </main>
    )
  }

  if (!analytics || error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{error ?? "Loading admin panel..."}</p>
      </main>
    )
  }

  const handlePresetSelect = (value: string) => {
    setRangePreset(value)
  }

  const handleCustomSelect = (range: DateRange | undefined) => {
    setCustomRange(range)
    setRangePreset("custom")
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Business performance overview for {dateRangeLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-start lg:justify-end">
            {presetOptions.map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant={rangePreset === preset.value ? "default" : "outline"}
                onClick={() => handlePresetSelect(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, "dd MMM")} - ${format(customRange.to, "dd MMM")}`
                    : "Select range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" selected={customRange} onSelect={handleCustomSelect} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{numberFormatter.format(analytics.overview.totalOrders)}</div>
              <p className="text-xs text-muted-foreground">Orders in selected period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatter.format(analytics.overview.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Completed payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <MonitorDot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{numberFormatter.format(analytics.overview.totalProducts)}</div>
              <p className="text-xs text-muted-foreground">Active listings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{numberFormatter.format(analytics.overview.totalUsers)}</div>
              <p className="text-xs text-muted-foreground">Registered customers</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => compactCurrencyFormatter.format(value)} />
                    <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCategories.map((category) => (
                  <div key={category.categoryName} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{category.categoryName}</p>
                      <p className="text-xs text-muted-foreground">{numberFormatter.format(category.units)} units</p>
                    </div>
                    <div className="font-medium">
                      {currencyFormatter.format(category.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4">
           <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 {analytics.topProducts.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Sold: {product.unitsSold}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{currencyFormatter.format(product.revenue)}</p>
                        {product.averageRating && (
                          <div className="flex items-center justify-end text-xs text-yellow-500">
                             {product.averageRating} ★ ({product.reviewCount})
                          </div>
                        )}
                      </div>
                    </div>
                 ))}
               </div>
            </CardContent>
           </Card>
        </div>

      </div>
    </main>
  )
}
