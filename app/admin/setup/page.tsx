"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle, XCircle, Loader2, Building2, Layers, Package } from "lucide-react"

interface SetupResult {
    message: string
    created: number
    errors: number
    errorMessages?: string[]
}

export default function SetupPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<{
        brands?: SetupResult
        categories?: SetupResult
        products?: SetupResult
    }>({})

    useEffect(() => {
        if (!session) {
            router.push("/auth/login")
        }
    }, [session, router])

    const setupBrands = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/setup/brands', { method: 'POST' })
            const result = await response.json()
            setResults(prev => ({ ...prev, brands: result }))
        } catch (error) {
            console.error('Error setting up brands:', error)
        } finally {
            setLoading(false)
        }
    }

    const setupCategories = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/setup/categories', { method: 'POST' })
            const result = await response.json()
            setResults(prev => ({ ...prev, categories: result }))
        } catch (error) {
            console.error('Error setting up categories:', error)
        } finally {
            setLoading(false)
        }
    }

    const setupProducts = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/setup/products', { method: 'POST' })
            const result = await response.json()
            setResults(prev => ({ ...prev, products: result }))
        } catch (error) {
            console.error('Error setting up products:', error)
        } finally {
            setLoading(false)
        }
    }

    const setupAll = async () => {
        setLoading(true)
        try {
            await setupBrands()
            await setupCategories()
            await setupProducts()
        } catch (error) {
            console.error('Error setting up all:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!session) {
        return null
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Admin
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Setup Skincare Brands</h1>
                        <p className="text-muted-foreground">Initialize your three skincare brands with sample data</p>
                    </div>
                </div>

                {/* Setup Steps */}
                <div className="space-y-6">
                    {/* Step 1: Brands */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                Step 1: Create Brands
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Create the three main skincare brands: InstaPeels, DermaFlay, and Vibrissa with their branding information.
                            </p>

                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={setupBrands}
                                    disabled={loading}
                                    className="bg-primary text-primary-foreground"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Create Brands
                                </Button>

                                {results.brands && (
                                    <div className="flex items-center gap-2">
                                        {results.brands.errors === 0 ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        )}
                                        <span className="text-sm">
                                            {results.brands.created} brands created, {results.brands.errors} errors
                                        </span>
                                    </div>
                                )}
                            </div>

                            {results.brands?.errorMessages && results.brands.errorMessages.length > 0 && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                                    <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                                    <ul className="text-sm text-red-700 space-y-1">
                                        {results.brands.errorMessages.map((error, index) => (
                                            <li key={index}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 2: Categories */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="w-5 h-5" />
                                Step 2: Create Categories
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Create brand-specific categories for each skincare brand with relevant product categories.
                            </p>

                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={setupCategories}
                                    disabled={loading}
                                    className="bg-primary text-primary-foreground"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Create Categories
                                </Button>

                                {results.categories && (
                                    <div className="flex items-center gap-2">
                                        {results.categories.errors === 0 ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        )}
                                        <span className="text-sm">
                                            {results.categories.created} categories created, {results.categories.errors} errors
                                        </span>
                                    </div>
                                )}
                            </div>

                            {results.categories?.errorMessages && results.categories.errorMessages.length > 0 && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                                    <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                                    <ul className="text-sm text-red-700 space-y-1">
                                        {results.categories.errorMessages.map((error, index) => (
                                            <li key={index}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 3: Products */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Step 3: Create Sample Products
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Add sample products for each brand to showcase the platform functionality.
                            </p>

                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={setupProducts}
                                    disabled={loading}
                                    className="bg-primary text-primary-foreground"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Create Products
                                </Button>

                                {results.products && (
                                    <div className="flex items-center gap-2">
                                        {results.products.errors === 0 ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        )}
                                        <span className="text-sm">
                                            {results.products.created} products created, {results.products.errors} errors
                                        </span>
                                    </div>
                                )}
                            </div>

                            {results.products?.errorMessages && results.products.errorMessages.length > 0 && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                                    <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                                    <ul className="text-sm text-red-700 space-y-1">
                                        {results.products.errorMessages.map((error, index) => (
                                            <li key={index}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Setup All Button */}
                    <Card className="border-primary">
                        <CardHeader>
                            <CardTitle>Quick Setup</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Run all setup steps at once to quickly initialize your skincare platform.
                            </p>

                            <Button
                                onClick={setupAll}
                                disabled={loading}
                                size="lg"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Setup Everything
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Success Message */}
                    {Object.values(results).every(result => result && result.errors === 0) && Object.keys(results).length === 3 && (
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-green-800">
                                    <CheckCircle className="w-5 h-5" />
                                    <h3 className="font-semibold">Setup Complete!</h3>
                                </div>
                                <p className="text-green-700 mt-2">
                                    Your skincare platform is now ready with three brands, categories, and sample products.
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <Link href="/admin/companies">
                                        <Button variant="outline" size="sm">View Companies</Button>
                                    </Link>
                                    <Link href="/shop">
                                        <Button variant="outline" size="sm">View Shop</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </main>
    )
}
