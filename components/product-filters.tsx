"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProductFiltersProps {
  companies: Array<{ _id: string; name: string; slug: string }>
  onFilterChange: (filters: { company?: string; priceRange?: [number, number] }) => void
}

export function ProductFilters({ companies, onFilterChange }: ProductFiltersProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])

  const handleCompanyChange = (slug: string) => {
    setSelectedCompany(slug)
    onFilterChange({ company: slug, priceRange })
  }

  const handlePriceChange = (newRange: [number, number]) => {
    setPriceRange(newRange)
    onFilterChange({ company: selectedCompany, priceRange: newRange })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand Filter */}
        <div>
          <h3 className="font-semibold text-sm mb-3">Brands</h3>
          <div className="space-y-2">
            <Button
              variant={selectedCompany === "" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleCompanyChange("")}
            >
              All Brands
            </Button>
            {companies.map((company) => (
              <Button
                key={company._id}
                variant={selectedCompany === company.slug ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleCompanyChange(company.slug)}
              >
                {company.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Price Filter */}
        <div>
          <h3 className="font-semibold text-sm mb-3">Price Range</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={priceRange[0]}
                onChange={(e) => handlePriceChange([Number.parseInt(e.target.value), priceRange[1]])}
                className="w-full px-2 py-1 border border-border rounded text-sm"
                placeholder="Min"
              />
              <input
                type="number"
                max="10000"
                value={priceRange[1]}
                onChange={(e) => handlePriceChange([priceRange[0], Number.parseInt(e.target.value)])}
                className="w-full px-2 py-1 border border-border rounded text-sm"
                placeholder="Max"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ₹{priceRange[0]} - ₹{priceRange[1]}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
