import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { Company } from "@/lib/models/company"
import { Review } from "@/lib/models/review"
import "@/lib/models/category"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"

const rangePresets: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
}

function normalizeDate(date: Date, endOfDay: boolean) {
  if (endOfDay) {
    date.setHours(23, 59, 59, 999)
  } else {
    date.setHours(0, 0, 0, 0)
  }
  return date
}

function parseDateRange(range: string | null, startParam: string | null, endParam: string | null) {
  const now = new Date()
  const endDate = normalizeDate(endParam ? new Date(endParam) : new Date(now), true)
  let startDate: Date

  if (range === "custom" && startParam) {
    startDate = normalizeDate(new Date(startParam), false)
  } else {
    const presetDays = rangePresets[range ?? ""] ?? rangePresets["3m"]
    startDate = normalizeDate(new Date(endDate), false)
    startDate.setDate(startDate.getDate() - presetDays + 1)
  }

  if (startDate > endDate) {
    const temp = new Date(startDate)
    startDate = normalizeDate(new Date(endDate), false)
    endDate.setTime(temp.getTime())
  }

  const duration = endDate.getTime() - startDate.getTime()
  const previousEnd = new Date(startDate.getTime() - 1)
  const previousStart = new Date(previousEnd.getTime() - duration)
  normalizeDate(previousStart, false)
  normalizeDate(previousEnd, true)

  return { startDate, endDate, previousStart, previousEnd }
}

function monthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}-01`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const { startDate, endDate, previousStart, previousEnd } = parseDateRange(
      searchParams.get("range"),
      searchParams.get("start"),
      searchParams.get("end"),
    )

    const overviewTotalOrders = await Order.countDocuments()
    const overviewRevenueAgg = await Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ])
    const overviewTotalProducts = await Product.countDocuments({ isActive: true })
    const overviewTotalUsers = await User.countDocuments({ role: "user" })

    const companyDocs = await Company.find({ isActive: true }).select("name slug logo").lean()
    const companyMap = new Map<string, { name: string; slug: string; logo?: string }>()
    for (const company of companyDocs) {
      companyMap.set(company._id.toString(), {
        name: company.name,
        slug: company.slug,
        logo: company.logo,
      })
    }

    const ordersCurrent = await Order.find({
      paymentStatus: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: "items.product",
        select: "name image company category price slug",
        populate: [
          { path: "company", select: "name slug logo" },
          { path: "category", select: "name slug" },
        ],
      })
      .populate({ path: "user", select: "name email" })
      .sort({ createdAt: -1 })
      .lean()

    const ordersPrevious = await Order.find({
      paymentStatus: "completed",
      createdAt: { $gte: previousStart, $lte: previousEnd },
    })
      .populate({
        path: "items.product",
        select: "company",
        populate: [{ path: "company", select: "slug" }],
      })
      .lean()

    const ordersAllStatuses = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .select("paymentMethod paymentStatus totalAmount createdAt user")
      .lean()

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name email")
      .populate("items.product", "name price")
      .lean()

    const orderStatusBreakdown = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ])

    const paymentStatusBreakdown = await Order.aggregate([
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
    ])

    const revenueByMonthRaw = await Order.find({
      paymentStatus: "completed",
      createdAt: { $gte: new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1) },
    })
      .select("totalAmount createdAt")
      .lean()

    const revenueByMonthMap = new Map<string, { revenue: number; orders: number }>()
    for (const order of revenueByMonthRaw) {
      const key = monthKey(new Date(order.createdAt))
      const existing = revenueByMonthMap.get(key)
      if (existing) {
        existing.revenue += order.totalAmount
        existing.orders += 1
      } else {
        revenueByMonthMap.set(key, { revenue: order.totalAmount, orders: 1 })
      }
    }

    const productStats = new Map<
      string,
      {
        name: string
        slug?: string
        image?: string
        companyId: string
        companyName: string
        companySlug: string
        companyLogo?: string
        unitsSold: number
        revenue: number
      }
    >()
    const companyStats = new Map<
      string,
      {
        name: string
        slug: string
        logo?: string
        revenue: number
        orderIds: Set<string>
        monthlyRevenue: Map<string, number>
        orders: number
        unitsSold: number
      }
    >()
    const categoryStats = new Map<
      string,
      {
        categoryName: string
        companyId: string
        companyName: string
        revenue: number
        orders: number
        units: number
      }
    >()
    const companyRevenueShare = new Map<string, number>()
    const hourlyOrders = Array.from({ length: 24 }, () => ({ orders: 0, revenue: 0 }))
    const weekdayOrders = Array.from({ length: 7 }, () => ({ orders: 0, revenue: 0 }))
    const customerRangeStats = new Map<
      string,
      {
        orders: number
        revenue: number
      }
    >()
    const geographyMap = new Map<
      string,
      {
        state: string
        orders: number
        revenue: number
        cities: Map<string, { city: string; orders: number; revenue: number }>
      }
    >()
    let totalGeographyOrders = 0
    let totalGeographyRevenue = 0

    for (const order of ordersCurrent) {
      const orderId = order._id.toString()
      const orderDate = new Date(order.createdAt)
      const hour = orderDate.getHours()
      const weekday = orderDate.getDay()
      hourlyOrders[hour].orders += 1
      hourlyOrders[hour].revenue += order.totalAmount
      weekdayOrders[weekday].orders += 1
      weekdayOrders[weekday].revenue += order.totalAmount

      const userId = order.user?._id ? order.user._id.toString() : String(order.user)
      const customerStat = customerRangeStats.get(userId)
      if (customerStat) {
        customerStat.orders += 1
        customerStat.revenue += order.totalAmount
      } else {
        customerRangeStats.set(userId, { orders: 1, revenue: order.totalAmount })
      }

      const state = order.shippingAddress?.state?.trim()
      const city = order.shippingAddress?.city?.trim()
      if (state) {
        const stateKey = state.toLowerCase()
        const geoState = geographyMap.get(stateKey)
        if (geoState) {
          geoState.orders += 1
          geoState.revenue += order.totalAmount
          totalGeographyOrders += 1
          totalGeographyRevenue += order.totalAmount
          if (city) {
            const cityKey = city.toLowerCase()
            const cityStats = geoState.cities.get(cityKey)
            if (cityStats) {
              cityStats.orders += 1
              cityStats.revenue += order.totalAmount
            } else {
              geoState.cities.set(cityKey, { city, orders: 1, revenue: order.totalAmount })
            }
          }
        } else {
          const cities = new Map<string, { city: string; orders: number; revenue: number }>()
          if (city) {
            cities.set(city.toLowerCase(), { city, orders: 1, revenue: order.totalAmount })
          }
          geographyMap.set(stateKey, {
            state,
            orders: 1,
            revenue: order.totalAmount,
            cities,
          })
          totalGeographyOrders += 1
          totalGeographyRevenue += order.totalAmount
        }
      }

      for (const item of order.items || []) {
        const quantity = item.quantity ?? 0
        if (!quantity) continue
        const product: any = item.product
        if (!product || !product.company) continue
        const companyId = product.company._id ? product.company._id.toString() : product.company.toString()
        const companyInfo = companyStats.get(companyId)
        const revenue = (item.price ?? product.price ?? 0) * quantity
        const month = monthKey(orderDate)

        if (companyInfo) {
          companyInfo.revenue += revenue
          companyInfo.unitsSold += quantity
          companyInfo.orderIds.add(orderId)
          const monthValue = companyInfo.monthlyRevenue.get(month) ?? 0
          companyInfo.monthlyRevenue.set(month, monthValue + revenue)
        } else {
          companyStats.set(companyId, {
            name: product.company.name,
            slug: product.company.slug,
            logo: product.company.logo,
            revenue,
            orderIds: new Set([orderId]),
            monthlyRevenue: new Map([[month, revenue]]),
            orders: 0,
            unitsSold: quantity,
          })
        }

        const companyShareValue = companyRevenueShare.get(companyId) ?? 0
        companyRevenueShare.set(companyId, companyShareValue + revenue)

        const productId = product._id.toString()
        const productInfo = productStats.get(productId)
        if (productInfo) {
          productInfo.unitsSold += quantity
          productInfo.revenue += revenue
        } else {
          productStats.set(productId, {
            name: product.name,
            slug: product.slug,
            image: product.image,
            companyId,
            companyName: product.company.name,
            companySlug: product.company.slug,
            companyLogo: product.company.logo,
            unitsSold: quantity,
            revenue,
          })
        }

        if (product.category) {
          const categoryId = product.category._id
            ? product.category._id.toString()
            : product.category.toString()
          const categoryInfo = categoryStats.get(categoryId)
          if (categoryInfo) {
            categoryInfo.revenue += revenue
            categoryInfo.orders += 1
            categoryInfo.units += quantity
          } else {
            categoryStats.set(categoryId, {
              categoryName: product.category.name ?? "Unknown",
              companyId,
              companyName: product.company.name,
              revenue,
              orders: 1,
              units: quantity,
            })
          }
        }
      }
    }

    for (const [companyId, stats] of companyStats) {
      stats.orders = stats.orderIds.size
    }

    const previousProductRevenue = new Map<string, number>()
    const previousCompanyRevenue = new Map<string, number>()
    const previousCompanyOrders = new Map<string, number>()

    for (const order of ordersPrevious) {
      const orderId = order._id.toString()
      const handledCompanyOrders = new Set<string>()
      for (const item of order.items || []) {
        const quantity = item.quantity ?? 0
        if (!quantity) continue
        const product: any = item.product
        if (!product || !product.company) continue
        const companyId = product.company._id ? product.company._id.toString() : product.company.toString()
        const revenue = (item.price ?? 0) * quantity
        previousProductRevenue.set(
          product._id.toString(),
          (previousProductRevenue.get(product._id.toString()) ?? 0) + revenue,
        )
        previousCompanyRevenue.set(companyId, (previousCompanyRevenue.get(companyId) ?? 0) + revenue)
        if (!handledCompanyOrders.has(companyId)) {
          previousCompanyOrders.set(companyId, (previousCompanyOrders.get(companyId) ?? 0) + 1)
          handledCompanyOrders.add(companyId)
        }
      }
    }

    const productIds = Array.from(productStats.keys())
    const productObjectIds = productIds
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id)
        } catch (error) {
          return null
        }
      })
      .filter(Boolean) as mongoose.Types.ObjectId[]

    const reviewAggregates = productObjectIds.length
      ? await Review.aggregate([
          { $match: { product: { $in: productObjectIds } } },
          {
            $group: {
              _id: "$product",
              averageRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 },
            },
          },
        ])
      : []

    const reviewMap = new Map<string, { averageRating: number; reviewCount: number }>()
    for (const review of reviewAggregates) {
      reviewMap.set(review._id.toString(), {
        averageRating: Number(review.averageRating?.toFixed(1) ?? 0),
        reviewCount: review.reviewCount,
      })
    }

    const topProducts = Array.from(productStats.entries())
      .map(([id, stats]) => {
        const previousRevenue = previousProductRevenue.get(id) ?? 0
        const growth = previousRevenue ? ((stats.revenue - previousRevenue) / previousRevenue) * 100 : null
        const reviewData = reviewMap.get(id)
        return {
          id,
          name: stats.name,
          slug: stats.slug,
          image: stats.image,
          company: {
            id: stats.companyId,
            name: stats.companyName,
            slug: stats.companySlug,
            logo: stats.companyLogo,
          },
          unitsSold: stats.unitsSold,
          revenue: stats.revenue,
          growth,
          averageRating: reviewData?.averageRating ?? null,
          reviewCount: reviewData?.reviewCount ?? 0,
        }
      })
      .sort((a, b) => {
        if (b.unitsSold === a.unitsSold) return b.revenue - a.revenue
        return b.unitsSold - a.unitsSold
      })

    const companySeries = Array.from(companyStats.entries()).map(([companyId, stats]) => {
      const previousRevenue = previousCompanyRevenue.get(companyId) ?? 0
      const previousOrders = previousCompanyOrders.get(companyId) ?? 0
      const growth = previousRevenue ? ((stats.revenue - previousRevenue) / previousRevenue) * 100 : null
      const averageOrderValue = stats.orders ? stats.revenue / stats.orders : 0
      return {
        companyId,
        name: stats.name,
        slug: stats.slug,
        logo: stats.logo,
        revenue: stats.revenue,
        orders: stats.orders,
        averageOrderValue,
        growth,
        monthlyRevenue: Array.from(stats.monthlyRevenue.entries()).map(([date, revenue]) => ({ date, revenue })),
      }
    })

    const totalRevenueCurrent = companySeries.reduce((sum, item) => sum + item.revenue, 0)
    const totalOrdersCurrent = companySeries.reduce((sum, item) => sum + item.orders, 0)

    const companyMarketShare = companySeries.map((item) => ({
      companyId: item.companyId,
      name: item.name,
      slug: item.slug,
      logo: item.logo,
      revenue: item.revenue,
      share: totalRevenueCurrent ? (item.revenue / totalRevenueCurrent) * 100 : 0,
    }))

    const companyRankings = companySeries
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .map((item, index) => ({
        rank: index + 1,
        companyId: item.companyId,
        name: item.name,
        slug: item.slug,
        logo: item.logo,
        revenue: item.revenue,
        orders: item.orders,
        averageOrderValue: item.averageOrderValue,
        growth: item.growth,
      }))

    const categoryPerformance = Array.from(categoryStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const customerAggregates = await Order.aggregate([
      { $match: { createdAt: { $lte: endDate } } },
      {
        $group: {
          _id: "$user",
          firstOrder: { $min: "$createdAt" },
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ])

    const customerSatisfaction = await Review.aggregate([
      {
        $group: {
          _id: "$company",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ])

    const satisfactionByCompany = customerSatisfaction.map((item) => {
      const companyId = item._id?.toString() ?? ""
      const companyInfo = companyMap.get(companyId)
      return {
        companyId,
        name: companyInfo?.name ?? "Unknown",
        slug: companyInfo?.slug ?? "",
        logo: companyInfo?.logo,
        averageRating: Number(item.averageRating?.toFixed(1) ?? 0),
        totalReviews: item.totalReviews,
      }
    })

    const satisfactionLookup = new Map(satisfactionByCompany.map((item) => [item.companyId, item]))

    const overallSatisfaction = satisfactionByCompany.reduce(
      (acc, item) => {
        acc.totalReviews += item.totalReviews
        acc.weightedRating += item.averageRating * item.totalReviews
        return acc
      },
      { totalReviews: 0, weightedRating: 0 },
    )

    const overallRating = overallSatisfaction.totalReviews
      ? Number((overallSatisfaction.weightedRating / overallSatisfaction.totalReviews).toFixed(1))
      : 0

    const topReviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("product", "name")
      .populate("company", "name slug logo")
      .lean()

    const paymentMethodStats = new Map<
      string,
      {
        method: string
        totalOrders: number
        completedOrders: number
        revenue: number
        totalAmount: number
      }
    >()

    for (const order of ordersAllStatuses) {
      const method = order.paymentMethod || "other"
      const stats = paymentMethodStats.get(method)
      if (stats) {
        stats.totalOrders += 1
        stats.totalAmount += order.totalAmount
        if (order.paymentStatus === "completed") {
          stats.completedOrders += 1
          stats.revenue += order.totalAmount
        }
      } else {
        paymentMethodStats.set(method, {
          method,
          totalOrders: 1,
          completedOrders: order.paymentStatus === "completed" ? 1 : 0,
          revenue: order.paymentStatus === "completed" ? order.totalAmount : 0,
          totalAmount: order.totalAmount,
        })
      }
    }

    const geographyStates = Array.from(geographyMap.values()).map((state) => ({
      state: state.state,
      orders: state.orders,
      revenue: state.revenue,
      cities: Array.from(state.cities.values()).sort((a, b) => b.revenue - a.revenue),
    }))
    geographyStates.sort((a, b) => b.revenue - a.revenue)

    const topCities = geographyStates
      .flatMap((state) => state.cities.map((city) => ({ ...city, state: state.state })))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const previousAverageOrderValue = (() => {
      const prevRevenue = Array.from(previousCompanyRevenue.values()).reduce((sum, value) => sum + value, 0)
      const prevOrders = Array.from(previousCompanyOrders.values()).reduce((sum, value) => sum + value, 0)
      return prevOrders ? prevRevenue / prevOrders : 0
    })()

    let newCustomers = 0
    let returningCustomers = 0
    let highValueCustomers = 0
    let totalClv = 0

    for (const customer of customerAggregates) {
      const firstOrderDate = new Date(customer.firstOrder)
      if (firstOrderDate >= startDate && firstOrderDate <= endDate) {
        newCustomers += 1
      } else if (customer.totalOrders > 0) {
        returningCustomers += 1
      }
      totalClv += customer.totalRevenue
    }

    const highValueThreshold = customerAggregates.length
      ? totalClv / customerAggregates.length
      : 0

    const topCustomers = await Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      {
        $group: {
          _id: "$user",
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ])

    for (const customer of customerAggregates) {
      if (customer.totalRevenue >= highValueThreshold) {
        highValueCustomers += 1
      }
    }

    const inventoryProducts = await Product.find()
      .select("name stock price company image slug isActive")
      .populate("company", "name slug logo")
      .lean()

    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    let overStock = 0
    let inStockValue = 0
    let lowStockValue = 0
    let outOfStockValue = 0
    let overStockValue = 0
    const lowStockProducts: any[] = []
    const companyProductMetrics = new Map<
      string,
      {
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
      }
    >()

    for (const product of inventoryProducts) {
      const stock = product.stock ?? 0
      const price = product.price ?? 0
      const totalValue = stock * price
      const companyId = product.company?._id?.toString()
      if (companyId) {
        const existing = companyProductMetrics.get(companyId)
        const baseMetrics =
          existing ??
          {
            companyId,
            name: product.company?.name ?? "Unknown",
            slug: product.company?.slug ?? "",
            logo: product.company?.logo,
            totalProducts: 0,
            activeProducts: 0,
            inactiveProducts: 0,
            outOfStock: 0,
            lowStock: 0,
            overStock: 0,
            totalInventoryValue: 0,
          }
        baseMetrics.totalProducts += 1
        if (product.isActive) {
          baseMetrics.activeProducts += 1
        } else {
          baseMetrics.inactiveProducts += 1
        }
        if (stock <= 0) {
          baseMetrics.outOfStock += 1
        } else if (stock < 10) {
          baseMetrics.lowStock += 1
        } else if (stock > 50) {
          baseMetrics.overStock += 1
        }
        baseMetrics.totalInventoryValue += totalValue
        companyProductMetrics.set(companyId, baseMetrics)
      }

      if (stock <= 0) {
        outOfStock += 1
        outOfStockValue += totalValue
        lowStockProducts.push(product)
      } else if (stock < 10) {
        lowStock += 1
        lowStockValue += totalValue
        lowStockProducts.push(product)
      } else {
        inStock += 1
        inStockValue += totalValue
        if (stock > 50) {
          overStock += 1
          overStockValue += totalValue
        }
      }
    }

    const companyProductPerformance = Array.from(companyProductMetrics.values()).map((metrics) => {
      const satisfaction = satisfactionLookup.get(metrics.companyId)
      return {
        ...metrics,
        averageRating: satisfaction?.averageRating ?? 0,
        totalReviews: satisfaction?.totalReviews ?? 0,
      }
    })

    const paymentAnalytics = Array.from(paymentMethodStats.values()).map((stats) => ({
      method: stats.method,
      orders: stats.totalOrders,
      revenue: stats.revenue,
      averageOrderValue: stats.completedOrders ? stats.revenue / stats.completedOrders : 0,
      successRate: stats.totalOrders ? (stats.completedOrders / stats.totalOrders) * 100 : 0,
    }))

    const averageOrderValueCurrent = totalOrdersCurrent ? totalRevenueCurrent / totalOrdersCurrent : 0
    const averageOrderValueChange = previousAverageOrderValue
      ? ((averageOrderValueCurrent - previousAverageOrderValue) / previousAverageOrderValue) * 100
      : null

    const marketShareTotal = companyMarketShare.reduce((sum, item) => sum + item.revenue, 0)

    return NextResponse.json({
      overview: {
        totalOrders: overviewTotalOrders,
        totalRevenue: overviewRevenueAgg[0]?.total || 0,
        totalProducts: overviewTotalProducts,
        totalUsers: overviewTotalUsers,
      },
      filters: {
        startDate,
        endDate,
      },
      companyPerformance: {
        companies: companySeries.map((item) => ({
          companyId: item.companyId,
          name: item.name,
          slug: item.slug,
          logo: item.logo,
          revenue: item.revenue,
          orders: item.orders,
          averageOrderValue: item.averageOrderValue,
          growth: item.growth,
          monthlyRevenue: item.monthlyRevenue,
        })),
        totalRevenue: totalRevenueCurrent,
        totalOrders: totalOrdersCurrent,
        averageOrderValue: averageOrderValueCurrent,
        averageOrderValueChange,
        marketShare: companyMarketShare.map((item) => ({
          companyId: item.companyId,
          name: item.name,
          slug: item.slug,
          logo: item.logo,
          revenue: item.revenue,
          share: marketShareTotal ? (item.revenue / marketShareTotal) * 100 : 0,
        })),
        rankings: companyRankings,
      },
      revenueByMonth: Array.from(revenueByMonthMap.entries()).map(([date, value]) => ({
        date,
        revenue: value.revenue,
        orders: value.orders,
      })),
      topProducts,
      topProductCompanies: companyProductPerformance,
      categoryPerformance,
      recentOrders,
      orderStatusBreakdown,
      paymentStatusBreakdown,
      topCustomers: await Promise.all(
        topCustomers.map(async (customer) => {
          const userDoc = await User.findById(customer._id).select("name email").lean()
          return {
            userId: customer._id.toString(),
            name: userDoc?.name ?? "Unknown",
            email: userDoc?.email ?? "",
            totalRevenue: customer.totalRevenue,
            totalOrders: customer.totalOrders,
          }
        }),
      ),
      customerAnalytics: {
        newCustomers,
        returningCustomers,
        averageOrderValue: averageOrderValueCurrent,
        previousAverageOrderValue,
        averageOrderValueChange,
        highValueCustomers,
        averageClv: customerAggregates.length ? totalClv / customerAggregates.length : 0,
      },
      paymentAnalytics,
      timeAnalytics: {
        hourly: hourlyOrders.map((item, index) => ({ hour: index, orders: item.orders, revenue: item.revenue })),
        weekday: weekdayOrders.map((item, index) => ({ weekday: index, orders: item.orders, revenue: item.revenue })),
      },
      geography: {
        totalOrders: totalGeographyOrders,
        totalRevenue: totalGeographyRevenue,
        states: geographyStates,
        topCities,
      },
      inventory: {
        summary: {
          inStock,
          inStockValue,
          lowStock,
          lowStockValue,
          outOfStock,
          outOfStockValue,
          overStock,
          overStockValue,
        },
        attention: lowStockProducts
          .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
          .slice(0, 10)
          .map((product) => ({
            id: product._id.toString(),
            name: product.name,
            stock: product.stock ?? 0,
            price: product.price ?? 0,
            company: product.company?.name ?? "",
            slug: product.slug,
            image: product.image,
          })),
      },
      customerSatisfaction: {
        overallRating,
        totalReviews: overallSatisfaction.totalReviews,
        byCompany: satisfactionByCompany,
        recentFeedback: topReviews.map((review) => ({
          id: review._id.toString(),
          product: {
            id: review.product?._id?.toString() ?? "",
            name: review.product?.name ?? "",
          },
          company: {
            id: review.company?._id?.toString() ?? "",
            name: review.company?.name ?? "",
            slug: review.company?.slug ?? "",
            logo: review.company?.logo,
          },
          rating: review.rating,
          comment: review.comment,
          userName: review.userName,
          createdAt: review.createdAt,
        })),
      },
      customerRangeStats: Array.from(customerRangeStats.entries()).map(([userId, value]) => ({
        userId,
        orders: value.orders,
        revenue: value.revenue,
      })),
    })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
