// app/products/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  slug: string;
  stock: number;
  category?: { _id: string; name: string; slug: string };
  origin?: "made-in-india" | "foreign-made" | "unspecified";
}
interface Category {
  _id: string;
  name: string;
  slug: string;
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="h-36 animate-pulse bg-stone-100" />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        <div className="w-56 shrink-0 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-5 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 border-b border-stone-100 pb-4 last:mb-0 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group mb-3 flex w-full items-center justify-between"
      >
        <span className="text-xs font-bold tracking-widest text-stone-500 uppercase">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-stone-400 transition-colors group-hover:text-stone-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-400 transition-colors group-hover:text-stone-600" />
        )}
      </button>
      {open && children}
    </div>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const originParam = searchParams.get("origin");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? [categoryParam] : []
  );
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>(
    originParam ? [originParam] : []
  );
  const [sortBy, setSortBy] = useState("newest");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (categoryParam) setSelectedCategories([categoryParam]);
  }, [categoryParam]);
  useEffect(() => {
    if (originParam) setSelectedOrigins([originParam]);
  }, [originParam]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/products?limit=100").then((r) => r.json()),
      fetch("/api/categories?flat=true").then((r) => r.json()),
    ])
      .then(([productsData, categoriesData]) => {
        const prods = Array.isArray(productsData)
          ? productsData
          : Array.isArray(productsData?.products)
            ? productsData.products
            : [];
        setProducts(prods);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }
  function toggleOrigin(val: string) {
    setSelectedOrigins((prev) =>
      prev.includes(val) ? prev.filter((o) => o !== val) : [...prev, val]
    );
  }
  function clearAll() {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedOrigins([]);
  }

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (searchQuery)
      result = result.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedCategories.length > 0)
      result = result.filter((p) => p.category && selectedCategories.includes(p.category._id));
    if (selectedOrigins.length > 0)
      result = result.filter((p) => {
        const o = p.origin || "unspecified";
        return selectedOrigins.includes(o);
      });
    if (sortBy === "price-low")
      result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    else if (sortBy === "price-high")
      result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    else result.reverse();
    return result;
  }, [products, searchQuery, selectedCategories, selectedOrigins, sortBy]);

  const activeFilterCount =
    (searchQuery ? 1 : 0) + selectedCategories.length + selectedOrigins.length;
  const selectedCategoryNames = categories
    .filter((c) => selectedCategories.includes(c._id))
    .map((c) => c.name);

  const ORIGINS = [
    { value: "made-in-india", label: "Made in India", emoji: "🇮🇳" },
    { value: "foreign-made", label: "International", emoji: "🌍" },
    { value: "unspecified", label: "Other", emoji: "🏷️" },
  ];

  const Sidebar = () => (
    <aside className="w-full">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-stone-500" />
          <span className="text-sm font-bold text-stone-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-amber-600 transition-colors hover:text-amber-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category filter */}
      <FilterSection title="Category">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategories([])}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedCategories.length === 0
                ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-700"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => toggleCategory(cat._id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCategories.includes(cat._id)
                  ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                  : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Origin filter */}
      <FilterSection title="Origin">
        <div className="flex flex-col gap-1.5">
          {ORIGINS.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleOrigin(value)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                selectedOrigins.includes(value)
                  ? "border-amber-300 bg-amber-50 font-semibold text-amber-700"
                  : "border-stone-100 bg-white text-stone-600 hover:border-amber-200 hover:bg-amber-50/50"
              }`}
            >
              <span className="text-base">{emoji}</span>
              {label}
              {selectedOrigins.includes(value) && <X className="ml-auto h-3 w-3 text-amber-500" />}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Sort — mobile only */}
      <div className="md:hidden">
        <FilterSection title="Sort By">
          <div className="flex flex-col gap-1">
            {[
              { value: "newest", label: "Newest First" },
              { value: "price-low", label: "Price: Low → High" },
              { value: "price-high", label: "Price: High → Low" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortBy(opt.value)}
                className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                  sortBy === opt.value
                    ? "bg-amber-50 font-semibold text-amber-700"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Page header */}
      <div className="border-b border-stone-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
          <p className="mb-1.5 text-xs font-semibold tracking-widest text-amber-600 uppercase">
            LinkAndSmile
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
                {selectedCategoryNames.length === 1
                  ? selectedCategoryNames[0]
                  : selectedOrigins.includes("made-in-india") && selectedOrigins.length === 1
                    ? "🇮🇳 Made in India"
                    : selectedOrigins.includes("foreign-made") && selectedOrigins.length === 1
                      ? "🌍 International Products"
                      : "All Products"}
              </h1>
              <p className="mt-1 text-sm text-stone-400">
                {loading
                  ? "Loading…"
                  : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""} from our curated collection`}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <div className="hidden flex-wrap gap-2 sm:flex">
                {searchQuery && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    "{searchQuery}"{" "}
                    <button onClick={() => setSearchQuery("")}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedCategoryNames.map((name, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                  >
                    {name}{" "}
                    <button onClick={() => toggleCategory(selectedCategories[i])}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedOrigins.map((o) => {
                  const found = ORIGINS.find((x) => x.value === o);
                  return found ? (
                    <span
                      key={o}
                      className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                    >
                      {found.emoji} {found.label}{" "}
                      <button onClick={() => toggleOrigin(o)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
        {/* Top bar */}
        <div className="mb-6 flex flex-col items-stretch gap-3 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl border-stone-200 bg-stone-50 pl-10 text-sm focus:border-amber-300 focus:ring-amber-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="hidden sm:block">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-48 rounded-xl border-stone-200 bg-stone-50 text-sm focus:ring-amber-300">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-stone-200">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low → High</SelectItem>
                <SelectItem value="price-high">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="hidden shrink-0 items-center text-xs font-medium whitespace-nowrap text-stone-400 md:flex">
            {loading ? "…" : `${filteredProducts.length} results`}
          </span>
        </div>

        <div className="flex items-start gap-6">
          {/* Desktop sidebar */}
          <div className="sticky top-24 hidden w-56 shrink-0 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm md:block">
            <Sidebar />
          </div>

          {/* Mobile sidebar drawer */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-40 flex md:hidden">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="relative ml-auto h-full w-72 max-w-full overflow-y-auto bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-bold text-stone-800">Filters</span>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <Sidebar />
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
                >
                  Show {filteredProducts.length} Results
                </button>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-stone-100 bg-white"
                  >
                    <div className="aspect-square animate-pulse bg-stone-100" />
                    <div className="space-y-2 p-3">
                      <div className="h-3.5 w-3/4 animate-pulse rounded-lg bg-stone-100" />
                      <div className="h-3 w-1/2 animate-pulse rounded-lg bg-stone-100" />
                      <div className="mt-2 h-8 animate-pulse rounded-xl bg-stone-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {filteredProducts.map((product, i) => (
                  <div
                    key={product._id}
                    style={{
                      opacity: 0,
                      animation: `productFadeIn 0.3s ease forwards`,
                      animationDelay: `${Math.min(i * 30, 300)}ms`,
                    }}
                  >
                    <ProductCard
                      id={product._id}
                      name={product.name}
                      price={product.price}
                      discountPrice={product.discountPrice}
                      image={product.image}
                      slug={product.slug}
                      stock={product.stock}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white py-24">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
                  <Package className="h-7 w-7 text-stone-300" />
                </div>
                <h3 className="mb-1 text-base font-bold text-stone-700">No products found</h3>
                <p className="mb-5 max-w-xs text-center text-sm text-stone-400">
                  Try adjusting your filters or search term.
                </p>
                <button
                  onClick={clearAll}
                  className="text-sm font-semibold text-amber-600 underline underline-offset-2 hover:text-amber-700"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes productFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
