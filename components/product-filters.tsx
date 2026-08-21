"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface ProductFiltersProps {
  companies: Array<{ _id: string; name: string; slug: string }>;
  onFilterChange: (filters: { company?: string; priceRange?: [number, number] }) => void;
}

export function ProductFilters({ companies, onFilterChange }: ProductFiltersProps) {
  const t = useTranslations("ProductFilters");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  const handleCompanyChange = (slug: string) => {
    setSelectedCompany(slug);
    onFilterChange({ company: slug, priceRange });
  };

  const handlePriceChange = (newRange: [number, number]) => {
    setPriceRange(newRange);
    onFilterChange({ company: selectedCompany, priceRange: newRange });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand Filter */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("brands")}</h3>
          <div className="space-y-2">
            <Button
              variant={selectedCompany === "" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleCompanyChange("")}
            >
              {t("allBrands")}
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
          <h3 className="mb-3 text-sm font-semibold">{t("priceRange")}</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={priceRange[0]}
                onChange={(e) =>
                  handlePriceChange([Number.parseInt(e.target.value), priceRange[1]])
                }
                className="border-border w-full rounded border px-2 py-1 text-sm"
                placeholder={t("min")}
              />
              <input
                type="number"
                max="10000"
                value={priceRange[1]}
                onChange={(e) =>
                  handlePriceChange([priceRange[0], Number.parseInt(e.target.value)])
                }
                className="border-border w-full rounded border px-2 py-1 text-sm"
                placeholder={t("max")}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
