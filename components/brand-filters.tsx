"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Filter } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import Link from "next/link"

interface Category {
    _id: string
    name: string
    slug: string
    description?: string
    subCategories?: Category[]
}

interface BrandFiltersProps {
    companySlug: string
    onCategoryChange: (categorySlug: string) => void
    selectedCategory?: string
}

export function BrandFilters({ companySlug, onCategoryChange, selectedCategory }: BrandFiltersProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`/api/categories?company=${companySlug}`)
                const data = await res.json()
                setCategories(data)
            } catch (error) {
                console.error("Error fetching categories:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchCategories()
    }, [companySlug])

    const handleCategoryChange = (categorySlug: string) => {
        onCategoryChange(categorySlug)
        setIsOpen(false)
    }

    const FilterContent = () => (
        <div className="space-y-4">
            {/* Company Name Header */}
            <div className="text-center py-2 border-b border-primary/20">
                <h2 className="text-lg font-bold uppercase tracking-wide">
                    {companySlug.includes("intapeels")
                        ? "Exfoliaters"
                        : companySlug.includes("dermaflay")
                        ? "Skincare"
                        : companySlug.replace("-", " ")}
                </h2>
            </div>

            {/* Categories */}
            <div>
                {loading ? (
                    <div className="py-2 space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i}>
                                <div className="h-5 bg-muted animate-pulse rounded mb-1" />
                                <div className="space-y-1 pl-3">
                                    <div className="h-4 bg-muted/60 animate-pulse rounded w-3/4" />
                                    <div className="h-4 bg-muted/60 animate-pulse rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {categories.map((mainCategory) => (
                            <div key={mainCategory._id}>
                                <h3 
                                    className="font-bold text-base mb-2 cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => handleCategoryChange(mainCategory.slug)}
                                >
                                    {mainCategory.name}
                                </h3>
                                {mainCategory.subCategories && mainCategory.subCategories.length > 0 && (
                                    <div className="space-y-1.5 pl-4">
                                        {mainCategory.subCategories.map((subCategory) => (
                                            <div
                                                key={subCategory._id}
                                                className={`cursor-pointer text-sm transition-colors ${
                                                    selectedCategory === subCategory.slug 
                                                        ? 'text-primary font-semibold' 
                                                        : 'text-foreground hover:text-primary'
                                                }`}
                                                onClick={() => handleCategoryChange(subCategory.slug)}
                                            >
                                                <Link href={`/shop/${companySlug}/${subCategory.slug}`}>
                                                    {subCategory.name}
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Clear Filters */}
            {selectedCategory && (
                <div className="pt-3 border-t border-primary/20">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleCategoryChange("")}
                    >
                        <X className="h-3 w-3 mr-2" />
                        Clear Filters
                    </Button>
                </div>
            )}
        </div>
    )

    return (
        <>
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                            {selectedCategory && (
                                <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                                    1
                                </span>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Filters</SheetTitle>
                            <SheetDescription>
                                Filter products by category
                            </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6">
                            <FilterContent />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <Card className="overflow-hidden border-2 border-purple-100 rounded-3xl">
                    <CardContent className="p-4">
                        <FilterContent />
                    </CardContent>
                </Card>
            </div>
        </>
    )
}