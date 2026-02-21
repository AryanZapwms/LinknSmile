import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
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

    const ordersCurrent = await Order.find({
      paymentStatus: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: "items.product",
        select: "name image category price slug",
        populate: [
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
        select: "name price",
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
        unitsSold: number
        revenue: number
      }
    >()
    const categoryStats = new Map<
      string,
      {
        categoryName: string
        revenue: number
        orders: number
        units: number
      }
    >()
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
        if (!product) continue
        const revenue = (item.price ?? product.price ?? 0) * quantity
        
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
              revenue,
              orders: 1,
              units: quantity,
            })
          }
        }
      }
    }

    const previousProductRevenue = new Map<string, number>()

    for (const order of ordersPrevious) {
      for (const item of order.items || []) {
        const quantity = item.quantity ?? 0
        if (!quantity) continue
        const product: any = item.product
        if (!product) continue
        const revenue = (item.price ?? 0) * quantity
        previousProductRevenue.set(
          product._id.toString(),
          (previousProductRevenue.get(product._id.toString()) ?? 0) + revenue,
        )
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
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ])

    const overallRating = customerSatisfaction[0]?.averageRating 
      ? Number(customerSatisfaction[0].averageRating.toFixed(1)) 
      : 0
    const totalReviewsCount = customerSatisfaction[0]?.totalReviews || 0

    const topReviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("product", "name")
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

    const previousAverageOrderValue = overviewTotalOrders > 0 ? (overviewRevenueAgg[0]?.total || 0) / overviewTotalOrders : 0

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

    const topCustomersResult = await Order.aggregate([
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
      .select("name stock price image slug isActive")
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
    
    // Removed companyProductMetrics entirely as it's no longer relevant

    for (const product of inventoryProducts) {
      const stock = product.stock ?? 0
      const price = product.price ?? 0
      const totalValue = stock * price

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

    const paymentAnalytics = Array.from(paymentMethodStats.values()).map((stats) => ({
      method: stats.method,
      orders: stats.totalOrders,
      revenue: stats.revenue,
      averageOrderValue: stats.completedOrders ? stats.revenue / stats.completedOrders : 0,
      successRate: stats.totalOrders ? (stats.completedOrders / stats.totalOrders) * 100 : 0,
    }))

    const averageOrderValueCurrent = overviewTotalOrders ? (overviewRevenueAgg[0]?.total || 0) / overviewTotalOrders : 0
    const averageOrderValueChange = previousAverageOrderValue
      ? ((averageOrderValueCurrent - previousAverageOrderValue) / previousAverageOrderValue) * 100
      : null

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
      revenueByMonth: Array.from(revenueByMonthMap.entries()).map(([date, value]) => ({
        date,
        revenue: value.revenue,
        orders: value.orders,
      })),
      topProducts,
      categoryPerformance,
      recentOrders,
      orderStatusBreakdown,
      paymentStatusBreakdown,
      topCustomers: await Promise.all(
        topCustomersResult.map(async (customer) => {
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
            slug: product.slug,
            image: product.image,
          })),
      },
      customerSatisfaction: {
        overallRating,
        totalReviews: totalReviewsCount,
        recentFeedback: topReviews.map((review: any) => ({
          id: review._id.toString(),
          product: {
            id: review.product?._id?.toString() ?? "",
            name: review.product?.name ?? "",
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
