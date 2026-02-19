"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  Download,
  Factory,
  Flame,
  Globe2,
  Layers,
  Medal,
  MonitorDot,
  Package,
  PieChart as PieChartIcon,
  Star,
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
  companyPerformance: {
    companies: Array<{
      companyId: string
      name: string
      slug: string
      logo?: string
      revenue: number
      orders: number
      averageOrderValue: number
      growth: number | null
      monthlyRevenue: Array<{ date: string; revenue: number }>
    }>
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    averageOrderValueChange: number | null
    marketShare: Array<{
      companyId: string
      name: string
      slug: string
      logo?: string
      revenue: number
      share: number
    }>
    rankings: Array<{
      rank: number
      companyId: string
      name: string
      slug: string
      logo?: string
      revenue: number
      orders: number
      averageOrderValue: number
      growth: number | null
    }>
  }
  revenueByMonth: Array<{ date: string; revenue: number; orders: number }>
  topProducts: Array<{
    id: string
    name: string
    slug?: string
    image?: string
    company: {
      id: string
      name: string
      slug: string
      logo?: string
    }
    unitsSold: number
    revenue: number
    growth: number | null
    averageRating: number | null
    reviewCount: number
  }>
  topProductCompanies: Array<{
    companyId: string
    name: string
    slug: string
    logo?: string
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
    outOfStock: number
    lowStock: number
    overStock: number
    totalInventoryValue: number
    averageRating: number
    totalReviews: number
  }>
  categoryPerformance: Array<{
    categoryName: string
    companyId: string
    companyName: string
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
    attention: Array<{ id: string; name: string; stock: number; price: number; company: string; slug?: string; image?: string }>
  }
  customerSatisfaction: {
    overallRating: number
    totalReviews: number
    byCompany: Array<{ companyId: string; name: string; slug: string; logo?: string; averageRating: number; totalReviews: number }>
    recentFeedback: Array<{
      id: string
      rating: number
      comment: string
      userName?: string
      createdAt: string
      product: { id: string; name: string }
      company: { id: string; name: string; slug: string; logo?: string }
    }>
  }
  customerRangeStats: Array<{ userId: string; orders: number; revenue: number }>
}

interface CompanyChartPoint {
  date: string
  label: string
  [key: string]: string | number
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

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const companyColors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#0ea5e9", "#14b8a6"]

export default function AdminDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangePreset, setRangePreset] = useState("3m")
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [companyChartType, setCompanyChartType] = useState<"line" | "area" | "bar">("line")
  const [productCompanyFilter, setProductCompanyFilter] = useState("all")
  const [productLimit, setProductLimit] = useState(10)

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
          setAnalytics(null)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    return () => controller.abort()
  }, [session, router, rangePreset, customRange?.from, customRange?.to])

  useEffect(() => {
    if (!analytics) {
      return
    }
    const companyIds = analytics.companyPerformance.companies.map((company) => company.companyId)
    if (!companyIds.length) {
      return
    }
    setSelectedCompanies((prev) => {
      if (prev.length && companyIds.length === prev.length && companyIds.every((id) => prev.includes(id))) {
        return prev
      }
      return companyIds
    })
  }, [analytics])

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

  const allCompanyIds = useMemo(() => analytics?.companyPerformance.companies.map((company) => company.companyId) ?? [], [analytics])

  const companyNameMap = useMemo(() => {
    const map = new Map<string, string>()
    analytics?.companyPerformance.companies.forEach((company) => {
      map.set(company.companyId, company.name)
    })
    return map
  }, [analytics])

  const selectedCompanyIds = selectedCompanies.length ? selectedCompanies : allCompanyIds

  const companyComparisonData = useMemo<CompanyChartPoint[]>(() => {
    if (!analytics) {
      return []
    }
    if (!selectedCompanyIds.length) {
      return []
    }
    const dateSet = new Set<string>()
    analytics.companyPerformance.companies.forEach((company) => {
      if (!selectedCompanyIds.includes(company.companyId)) {
        return
      }
      company.monthlyRevenue.forEach((entry) => {
        dateSet.add(entry.date)
      })
    })
    const dates = Array.from(dateSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    return dates.map((date) => {
      const label = format(new Date(date), "MMM yyyy")
      const point: CompanyChartPoint = { date, label }
      selectedCompanyIds.forEach((companyId) => {
        const company = analytics.companyPerformance.companies.find((item) => item.companyId === companyId)
        const revenueValue = company?.monthlyRevenue.find((item) => item.date === date)?.revenue ?? 0
        point[companyId] = revenueValue
      })
      return point
    })
  }, [analytics, selectedCompanyIds])

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

  const hourlyChartData = useMemo(() => {
    if (!analytics) {
      return []
    }
    return analytics.timeAnalytics.hourly.map((item) => ({
      hour: `${String(item.hour).padStart(2, "0")}:00`,
      orders: item.orders,
      revenue: item.revenue,
    }))
  }, [analytics])

  const weekdayChartData = useMemo(() => {
    if (!analytics) {
      return []
    }
    return analytics.timeAnalytics.weekday.map((item) => ({
      day: weekdayLabels[item.weekday] ?? String(item.weekday),
      orders: item.orders,
      revenue: item.revenue,
    }))
  }, [analytics])

  const marketShareData = useMemo(() => {
    if (!analytics) {
      return []
    }
    return analytics.companyPerformance.marketShare.map((item) => ({
      name: item.name,
      value: item.share,
      revenue: item.revenue,
    }))
  }, [analytics])

  const topCategories = useMemo(() => analytics?.categoryPerformance.slice(0, 8) ?? [], [analytics])
  const categoryTotalRevenue = useMemo(() => {
    if (!analytics) {
      return 0
    }
    return analytics.categoryPerformance.reduce((sum, category) => sum + category.revenue, 0)
  }, [analytics])

  const displayedProducts = useMemo(() => {
    if (!analytics) {
      return []
    }
    const filtered = productCompanyFilter === "all"
      ? analytics.topProducts
      : analytics.topProducts.filter((product) => product.company.id === productCompanyFilter)
    return filtered.slice(0, productLimit)
  }, [analytics, productCompanyFilter, productLimit])

  const topStates = useMemo(() => analytics?.geography.states.slice(0, 5) ?? [], [analytics])
  const topCities = useMemo(() => analytics?.geography.topCities.slice(0, 5) ?? [], [analytics])
  const topCustomerRanges = useMemo(() => analytics?.customerRangeStats.slice(0, 8) ?? [], [analytics])

  const peakHour = useMemo(() => {
    if (!analytics?.timeAnalytics.hourly.length) {
      return null
    }
    return analytics.timeAnalytics.hourly.reduce((best, item) => (item.revenue > (best?.revenue ?? 0) ? item : best), analytics.timeAnalytics.hourly[0])
  }, [analytics])

  const peakWeekday = useMemo(() => {
    if (!analytics?.timeAnalytics.weekday.length) {
      return null
    }
    return analytics.timeAnalytics.weekday.reduce((best, item) => (item.revenue > (best?.revenue ?? 0) ? item : best), analytics.timeAnalytics.weekday[0])
  }, [analytics])

  const aovChange = analytics?.companyPerformance.averageOrderValueChange ?? null
  const AovChangeIcon = (aovChange !== null && aovChange < 0 ? TrendingDown : TrendingUp) ?? TrendingUp
  const aovChangeVariant = aovChange !== null && aovChange < 0 ? "destructive" : "secondary"

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

  const handleToggleCompany = (companyId: string, checked: boolean) => {
    setSelectedCompanies((prev) => {
      if (checked) {
        if (prev.includes(companyId)) {
          return prev
        }
        return [...prev, companyId]
      }
      const next = prev.filter((id) => id !== companyId)
      return next
    })
  }

  const handleSelectAllCompanies = () => {
    if (!allCompanyIds.length) {
      return
    }
    const isAllSelected = selectedCompanyIds.length === allCompanyIds.length
    setSelectedCompanies(isAllSelected ? [] : allCompanyIds)
  }

  const handleExportCompanyRevenue = () => {
    if (!analytics || !companyComparisonData.length) {
      return
    }
    const selectedIds = selectedCompanyIds.length ? selectedCompanyIds : allCompanyIds
    if (!selectedIds.length) {
      return
    }
    const header = ["Period", ...selectedIds.map((id) => companyNameMap.get(id) ?? id)]
    const rows = companyComparisonData.map((row) => [row.label, ...selectedIds.map((id) => String(row[id] ?? 0))])
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = [header, ...rows]
      .map((line) => line.map((value) => escape(value)).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const start = format(new Date(analytics.filters.startDate), "yyyyMMdd")
    const end = format(new Date(analytics.filters.endDate), "yyyyMMdd")
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.setAttribute("download", `company-revenue-${start}-${end}.csv`)
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const companyTotalsRevenue = selectedCompanyIds.reduce((sum, companyId) => {
    const company = analytics.companyPerformance.companies.find((item) => item.companyId === companyId)
    return sum + (company?.revenue ?? 0)
  }, 0)

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
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Company Revenue Comparison</CardTitle>
                  <p className="text-sm text-muted-foreground">Multi-company revenue trends with monthly granularity</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={companyChartType} onValueChange={(value) => setCompanyChartType(value as typeof companyChartType)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="area">Area</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleSelectAllCompanies}>
                    {selectedCompanyIds.length === allCompanyIds.length ? "Show Custom" : "Select All"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCompanyRevenue}>
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {analytics.companyPerformance.companies.map((company) => {
                  const color = companyColors[company.companyId.charCodeAt(0) % companyColors.length]
                  const checked = selectedCompanyIds.includes(company.companyId)
                  return (
                    <label key={company.companyId} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
                      <span className="flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(checkedState) => handleToggleCompany(company.companyId, Boolean(checkedState))}
                        className="h-4 w-4"
                      />
                      <span className="text-foreground">{company.name}</span>
                    </label>
                  )
                })}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-foreground" />
                  Total revenue: {currencyFormatter.format(companyTotalsRevenue)}
                </span>
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-foreground" />
                  Average order value: {currencyFormatter.format(analytics.companyPerformance.averageOrderValue)}
                </span>
                <Badge variant={aovChangeVariant} className="gap-1">
                  <AovChangeIcon className="h-3 w-3" />
                  {aovChange !== null ? `${aovChange > 0 ? "+" : ""}${aovChange.toFixed(1)}% AOV change` : "AOV flat"}
                </Badge>
              </div>
              <div className="h-[360px]">
                {companyComparisonData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {companyChartType === "line" && (
                      <LineChart data={companyComparisonData} margin={{ left: 12, right: 16, top: 12, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrencyFormatter.format(value)} />
                        <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                        <Legend />
                        {selectedCompanyIds.map((companyId, index) => {
                          const color = companyColors[index % companyColors.length]
                          return (
                            <Line
                              key={companyId}
                              type="monotone"
                              dataKey={companyId}
                              stroke={color}
                              name={companyNameMap.get(companyId) ?? companyId}
                              strokeWidth={2}
                              dot={false}
                            />
                          )
                        })}
                      </LineChart>
                    )}
                    {companyChartType === "area" && (
                      <AreaChart data={companyComparisonData} margin={{ left: 12, right: 16, top: 12, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrencyFormatter.format(value)} />
                        <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                        <Legend />
                        {selectedCompanyIds.map((companyId, index) => {
                          const color = companyColors[index % companyColors.length]
                          return (
                            <Area
                              key={companyId}
                              type="monotone"
                              dataKey={companyId}
                              stroke={color}
                              fill={`${color}33`}
                              name={companyNameMap.get(companyId) ?? companyId}
                              strokeWidth={2}
                            />
                          )
                        })}
                      </AreaChart>
                    )}
                    {companyChartType === "bar" && (
                      <BarChart data={companyComparisonData} margin={{ left: 12, right: 16, top: 12, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrencyFormatter.format(value)} />
                        <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                        <Legend />
                        {selectedCompanyIds.map((companyId, index) => {
                          const color = companyColors[index % companyColors.length]
                          return (
                            <Bar
                              key={companyId}
                              dataKey={companyId}
                              name={companyNameMap.get(companyId) ?? companyId}
                              fill={color}
                              radius={[6, 6, 0, 0]}
                            />
                          )
                        })}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No company revenue data</div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Company Rankings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total revenue</span>
                <span className="font-semibold text-foreground">{currencyFormatter.format(analytics.companyPerformance.totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total orders</span>
                <span className="font-semibold text-foreground">{numberFormatter.format(analytics.companyPerformance.totalOrders)}</span>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {analytics.companyPerformance.rankings.map((company) => {
                  const growth = company.growth ?? 0
                  const GrowthIcon = growth >= 0 ? ArrowUp : ArrowDown
                  const growthColor = growth >= 0 ? "text-emerald-600" : "text-red-500"
                  const medalColor = company.rank === 1 ? "text-purple-500" : company.rank === 2 ? "text-slate-400" : company.rank === 3 ? "text-purple-700" : "text-muted-foreground"
                  return (
                    <div key={company.companyId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Medal className={`h-5 w-5 ${medalColor}`} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{company.name}</p>
                          <p className="text-xs text-muted-foreground">₹{numberFormatter.format(Math.round(company.revenue))} · {numberFormatter.format(company.orders)} orders</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 text-sm font-medium ${growthColor}`}>
                        <GrowthIcon className="h-3 w-3" />
                        {growth === null ? "—" : `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {marketShareData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={marketShareData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={4}>
                      {marketShareData.map((entry, index) => (
                        <Cell key={entry.name} fill={companyColors[index % companyColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No market share data</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Product Performance by Company</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {analytics.topProductCompanies.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Company</th>
                      <th className="py-2 pr-4 font-medium">Products</th>
                      <th className="py-2 pr-4 font-medium">Active</th>
                      <th className="py-2 pr-4 font-medium">Alerts</th>
                      <th className="py-2 pr-4 font-medium">Inventory Value</th>
                      <th className="py-2 pr-4 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProductCompanies.map((company) => (
                      <tr key={company.companyId} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-medium text-foreground">{company.name}</td>
                        <td className="py-3 pr-4">{numberFormatter.format(company.totalProducts)}</td>
                        <td className="py-3 pr-4">{numberFormatter.format(company.activeProducts)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>Low {company.lowStock}</span>
                            <span>Out {company.outOfStock}</span>
                            <span>Over {company.overStock}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{currencyFormatter.format(company.totalInventoryValue)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>{company.averageRating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({numberFormatter.format(company.totalReviews)})</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No product metrics</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Selling Products</CardTitle>
                <p className="text-sm text-muted-foreground">Best performers across all companies</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={productCompanyFilter} onValueChange={setProductCompanyFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {analytics.companyPerformance.companies.map((company) => (
                      <SelectItem key={company.companyId} value={company.companyId}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(productLimit)} onValueChange={(value) => setProductLimit(Number(value))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Top 5</SelectItem>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="15">Top 15</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayedProducts.length ? (
                <div className="space-y-4">
                  {displayedProducts.map((product, index) => {
                    const growth = product.growth ?? 0
                    const GrowthIcon = growth >= 0 ? ArrowUp : ArrowDown
                    const growthColor = growth >= 0 ? "text-emerald-600" : "text-red-500"
                    return (
                      <div key={product.id} className="flex flex-col gap-4 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <Image src={product.image} alt={product.name} width={56} height={56} className="h-14 w-14 rounded-lg object-cover" />
                          ) : (
                            <div className="h-14 w-14 rounded-lg bg-muted" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{index + 1}. {product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.company.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span>{product.averageRating ? product.averageRating.toFixed(1) : "—"}</span>
                              <span>({product.reviewCount})</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Units</p>
                            <p className="font-semibold">{numberFormatter.format(product.unitsSold)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="font-semibold">{currencyFormatter.format(product.revenue)}</p>
                          </div>
                          <div className={`flex items-center gap-1 text-xs font-semibold ${growthColor}`}>
                            <GrowthIcon className="h-3 w-3" />
                            {product.growth === null ? "—" : `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`}
                          </div>
                          <div>
                            <Link href={product.id ? `/shop/${product.company.slug}/product/${product.id}` : "#"} className="text-xs font-semibold text-primary hover:underline">
                              View product
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No product performance data</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.topCustomers.length ? (
                analytics.topCustomers.slice(0, 6).map((customer) => (
                  <div key={customer.userId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{currencyFormatter.format(customer.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">{numberFormatter.format(customer.totalOrders)} orders</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No customer data</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Total Sales Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {revenueChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData} margin={{ left: 12, right: 16, top: 12, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrencyFormatter.format(value)} />
                    <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Revenue" />
                    <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} name="Orders" yAxisId={1} />
                    <YAxis hide yAxisId={1} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No revenue data</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {analytics.orderStatusBreakdown.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.orderStatusBreakdown} dataKey="count" nameKey="_id" outerRadius={110} innerRadius={60} paddingAngle={4}>
                      {analytics.orderStatusBreakdown.map((entry, index) => (
                        <Cell key={entry._id} fill={companyColors[index % companyColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value}`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No order status data</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.paymentAnalytics.length ? (
                <div className="space-y-3">
                  {analytics.paymentAnalytics.map((method) => (
                    <div key={method.method} className="rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{method.method.toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">Success {method.successRate.toFixed(1)}%</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Orders</span>
                        <span className="text-right text-foreground font-semibold">{numberFormatter.format(method.orders)}</span>
                        <span>Revenue</span>
                        <span className="text-right text-foreground font-semibold">{currencyFormatter.format(method.revenue)}</span>
                        <span>Avg order value</span>
                        <span className="text-right text-foreground font-semibold">{currencyFormatter.format(method.averageOrderValue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No payment analytics</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Customer Acquisition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">New customers</p>
                  <p className="text-lg font-semibold">{numberFormatter.format(analytics.customerAnalytics.newCustomers)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Returning customers</p>
                  <p className="text-lg font-semibold">{numberFormatter.format(analytics.customerAnalytics.returningCustomers)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">High value customers</p>
                  <p className="text-lg font-semibold">{numberFormatter.format(analytics.customerAnalytics.highValueCustomers)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Average CLV</p>
                  <p className="text-lg font-semibold">{currencyFormatter.format(analytics.customerAnalytics.averageClv)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Average order value</p>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Current {currencyFormatter.format(analytics.customerAnalytics.averageOrderValue)}</Badge>
                  <Badge variant="outline">Previous {currencyFormatter.format(analytics.customerAnalytics.previousAverageOrderValue)}</Badge>
                  <Badge variant={aovChangeVariant} className="gap-1">
                    <AovChangeIcon className="h-3 w-3" />
                    {aovChange !== null ? `${aovChange > 0 ? "+" : ""}${aovChange.toFixed(1)}%` : "Flat"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Peak Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="h-4 w-4 text-foreground" />
                  Peak hour
                </div>
                <p className="text-lg font-semibold text-foreground mt-1">{peakHour ? `${String(peakHour.hour).padStart(2, "0")}:00` : "—"}</p>
                <p className="text-xs text-muted-foreground">Revenue {peakHour ? currencyFormatter.format(peakHour.revenue) : "—"}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="h-4 w-4 text-foreground" />
                  Top weekday
                </div>
                <p className="text-lg font-semibold text-foreground mt-1">{peakWeekday ? weekdayLabels[peakWeekday.weekday] : "—"}</p>
                <p className="text-xs text-muted-foreground">Revenue {peakWeekday ? currencyFormatter.format(peakWeekday.revenue) : "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Timing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="h-[150px]">
                {hourlyChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyChartData} margin={{ left: 12, right: 16, top: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="orders" stroke="#2563eb" fill="#2563eb33" name="Orders" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No hourly data</div>
                )}
              </div>
              <div className="h-[150px]">
                {weekdayChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weekdayChartData} margin={{ left: 12, right: 16, top: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="orders" stroke="#10b981" fill="#10b98133" name="Orders" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No weekday data</div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Geographic Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total orders</span>
                <span className="font-semibold text-foreground">{numberFormatter.format(analytics.geography.totalOrders)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total revenue</span>
                <span className="font-semibold text-foreground">{currencyFormatter.format(analytics.geography.totalRevenue)}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Top States</p>
                <div className="mt-2 space-y-2">
                  {topStates.map((state) => (
                    <div key={state.state} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{state.state}</span>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <p>{currencyFormatter.format(state.revenue)}</p>
                        <p className="text-xs">{numberFormatter.format(state.orders)} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Top Cities</p>
                <div className="mt-2 space-y-2">
                  {topCities.map((city) => (
                    <div key={`${city.state}-${city.city}`} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{city.city}, {city.state}</span>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <p>{currencyFormatter.format(city.revenue)}</p>
                        <p className="text-xs">{numberFormatter.format(city.orders)} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inventory Health</CardTitle>
              <Badge variant="outline" className="gap-1">
                <PieChartIcon className="h-3 w-3" />
                {analytics.inventory.summary.inStock + analytics.inventory.summary.lowStock + analytics.inventory.summary.outOfStock}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">In Stock</p>
                <p className="text-xl font-semibold">{numberFormatter.format(analytics.inventory.summary.inStock)}</p>
                <p className="text-xs text-muted-foreground">{currencyFormatter.format(analytics.inventory.summary.inStockValue)}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-semibold">{numberFormatter.format(analytics.inventory.summary.lowStock)}</p>
                <p className="text-xs text-muted-foreground">{currencyFormatter.format(analytics.inventory.summary.lowStockValue)}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-semibold">{numberFormatter.format(analytics.inventory.summary.outOfStock)}</p>
                <p className="text-xs text-muted-foreground">{currencyFormatter.format(analytics.inventory.summary.outOfStockValue)}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Overstock</p>
                <p className="text-xl font-semibold">{numberFormatter.format(analytics.inventory.summary.overStock)}</p>
                <p className="text-xs text-muted-foreground">{currencyFormatter.format(analytics.inventory.summary.overStockValue)}</p>
              </div>
              <div className="col-span-2 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Products needing attention</p>
                {analytics.inventory.attention.length ? (
                  <div className="space-y-2">
                    {analytics.inventory.attention.map((product) => (
                      <div key={product.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span className="text-foreground">{product.name}</span>
                        <div className="text-right text-muted-foreground">
                          <p>{product.company}</p>
                          <p className="text-xs">Stock {product.stock}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No low inventory alerts</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Customer Satisfaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-semibold text-foreground">{analytics.customerSatisfaction.overallRating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Average rating across all feedback</p>
                </div>
                <Badge variant="secondary">{numberFormatter.format(analytics.customerSatisfaction.totalReviews)} reviews</Badge>
              </div>
              <div className="space-y-3">
                {analytics.customerSatisfaction.byCompany.slice(0, 3).map((company) => (
                  <div key={company.companyId} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{company.name}</span>
                    <span className="text-sm font-semibold">{company.averageRating.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {analytics.customerSatisfaction.recentFeedback.map((feedback) => (
                  <div key={feedback.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{feedback.userName ?? "Anonymous"}</span>
                      <span>{format(new Date(feedback.createdAt), "dd MMM yyyy")}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{feedback.comment}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {feedback.company.name} · {feedback.product.name}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {analytics.recentOrders.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Order</th>
                    <th className="py-2 pr-4 font-medium">Customer</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentOrders.map((order) => (
                    <tr key={order._id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-mono text-xs">{order.orderNumber}</td>
                      <td className="py-3 pr-4">{order.user?.name ?? "Unknown"}</td>
                      <td className="py-3 pr-4 font-semibold">{currencyFormatter.format(order.totalAmount)}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={order.paymentStatus === "completed" ? "outline" : order.paymentStatus === "pending" ? "secondary" : "destructive"}>
                          {order.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{format(new Date(order.createdAt), "dd MMM yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No recent orders</div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
