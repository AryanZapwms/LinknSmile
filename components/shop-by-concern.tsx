"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HeartPulse } from "lucide-react"

interface ConcernProduct {
    _id: string
    name: string
    slug: string
    company: {
        _id: string
        slug: string
        name: string
    }
}

interface ShopByConcernItem {
    _id: string
    title: string
    image: string
    description?: string
    isActive: boolean
    priority: number
    product?: ConcernProduct | string
}

interface ShopByConcernSettings {
    isVisible: boolean
    limit: number
}

interface ShopByConcernProps {
    companyId: string
    companySlug: string
}

export function ShopByConcern({ companyId, companySlug }: ShopByConcernProps) {
    const [items, setItems] = useState<ShopByConcernItem[]>([])
    const [settings, setSettings] = useState<ShopByConcernSettings>({
        isVisible: true,
        limit: 6,
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchConcerns = async () => {
            try {
                setLoading(true)
                setError(null)

                const response = await fetch(`/api/companies/${companyId}/shop-by-concern`)
                if (!response.ok) throw new Error("Failed to fetch shop by concern data")

                const data = await response.json()
                setSettings(data.settings || { isVisible: true, limit: 6 })

                if (Array.isArray(data.items)) {
                    const transformed = data.items
                        .map((item: any) => {
                            if (!item) return null

                            const product = item.product || item.productId

                            return {
                                _id: item._id,
                                title: item.title,
                                image: item.image,
                                description: item.description,
                                isActive: item.isActive ?? true,
                                priority: item.priority ?? 0,
                                product:
                                    product && typeof product === "object"
                                        ? {
                                            _id: product._id,
                                            name: product.name,
                                            slug: product.slug,
                                            company: product.company || {
                                                _id: companyId,
                                                slug: companySlug,
                                                name: "",
                                            },
                                        }
                                        : undefined,
                            } as ShopByConcernItem
                        })
                        .filter((item: ShopByConcernItem | null): item is ShopByConcernItem => item !== null)

                    setItems(transformed)
                }
            } catch (err) {
                console.error("Error fetching shop by concern data:", err)
                setError(err instanceof Error ? err.message : "Unknown error")
            } finally {
                setLoading(false)
            }
        }

        if (companyId) fetchConcerns()
    }, [companyId, companySlug])

    const activeItems = useMemo(() => {
        return items
            .filter((item) => item.isActive)
            .sort((a, b) => a.priority - b.priority)
            .slice(0, settings.limit)
    }, [items, settings.limit])

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="w-5 h-5" />
                        Shop by Concern
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center gap-6">
                    {[...Array(settings.limit || 6)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-24 rounded-full" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (error || !settings.isVisible || activeItems.length === 0) return null

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-lg font-semibold">
                    <HeartPulse className="w-5 h-5 text-primary" />
                    Shop By Concern
                </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
                <div className="flex flex-wrap justify-center gap-8 p-8 rounded-md overflow-hidden" style={{backgroundColor:'#FAF6E8'}}>
                    {activeItems.map((item) => {
                        const product =
                            item.product && typeof item.product === "object" ? item.product : undefined
                        const href = product?._id
                            ? `/shop/${product.company?.slug || companySlug}/product/${product._id}`
                            : `/shop/${companySlug}`

                        return (
                            <Link
                                key={item._id}
                                href={href}
                                className="flex flex-col items-center text-center group transition-all"
                            >
                                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={item.image || "/companylogo.jpg"}
                                        alt={item.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <p className="mt-3 text-sm md:text-base font-medium text-foreground group-hover:text-primary transition-colors">
                                    {item.title}
                                </p>
                            </Link>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
