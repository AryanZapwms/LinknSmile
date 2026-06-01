// app/products/page.tsx
'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/product-card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Package, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Product {
  _id: string; name: string; price: number; discountPrice?: number;
  image: string; slug: string; stock: number;
  category?: { _id: string; name: string; slug: string };
  origin?: "made-in-india" | "foreign-made" | "unspecified";
}
interface Category { _id: string; name: string; slug: string }

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
      <div className="h-36 bg-stone-100 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
        <div className="w-56 shrink-0 space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-stone-100 animate-pulse rounded-xl" />)}
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-stone-100 animate-pulse rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button type="button" onClick={() => setOpen(v => !v)} className="flex items-center justify-between w-full mb-3 group">
        <span className="text-xs font-bold text-stone-500 tracking-widest uppercase">{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-stone-400 group-hover:text-stone-600 transition-colors" />
          : <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-stone-600 transition-colors" />
        }
      </button>
      {open && children}
    </div>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const originParam = searchParams.get('origin');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoryParam ? [categoryParam] : []);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>(originParam ? [originParam] : []);
  const [sortBy, setSortBy] = useState('newest');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => { if (categoryParam) setSelectedCategories([categoryParam]) }, [categoryParam]);
  useEffect(() => { if (originParam) setSelectedOrigins([originParam]) }, [originParam]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/products?limit=100').then(r => r.json()),
      fetch('/api/categories?flat=true').then(r => r.json()),
    ])
      .then(([productsData, categoriesData]) => {
        const prods = Array.isArray(productsData)
          ? productsData
          : Array.isArray(productsData?.products) ? productsData.products : [];
        setProducts(prods);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }
  function toggleOrigin(val: string) {
    setSelectedOrigins(prev => prev.includes(val) ? prev.filter(o => o !== val) : [...prev, val]);
  }
  function clearAll() { setSearchQuery(''); setSelectedCategories([]); setSelectedOrigins([]); }

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (searchQuery) result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedCategories.length > 0) result = result.filter(p => p.category && selectedCategories.includes(p.category._id));
    if (selectedOrigins.length > 0) result = result.filter(p => {
      const o = p.origin || "unspecified";
      return selectedOrigins.includes(o);
    });
    if (sortBy === 'price-low') result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    else if (sortBy === 'price-high') result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    else result.reverse();
    return result;
  }, [products, searchQuery, selectedCategories, selectedOrigins, sortBy]);

  const activeFilterCount = (searchQuery ? 1 : 0) + selectedCategories.length + selectedOrigins.length;
  const selectedCategoryNames = categories.filter(c => selectedCategories.includes(c._id)).map(c => c.name);

  const ORIGINS = [
    { value: "made-in-india",  label: "Made in India",       emoji: "🇮🇳" },
    { value: "foreign-made",   label: "International",       emoji: "🌍" },
    { value: "unspecified",    label: "Other",               emoji: "🏷️" },
  ];

  const Sidebar = () => (
    <aside className="w-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-stone-500" />
          <span className="text-sm font-bold text-stone-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors">
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
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              selectedCategories.length === 0
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300 hover:text-amber-700'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat._id}
              type="button"
              onClick={() => toggleCategory(cat._id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selectedCategories.includes(cat._id)
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300 hover:text-amber-700'
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
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                selectedOrigins.includes(value)
                  ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
                  : 'bg-white text-stone-600 border-stone-100 hover:border-amber-200 hover:bg-amber-50/50'
              }`}
            >
              <span className="text-base">{emoji}</span>
              {label}
              {selectedOrigins.includes(value) && (
                <X className="w-3 h-3 ml-auto text-amber-500" />
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Sort — mobile only */}
      <div className="md:hidden">
        <FilterSection title="Sort By">
          <div className="flex flex-col gap-1">
            {[
              { value: 'newest', label: 'Newest First' },
              { value: 'price-low', label: 'Price: Low → High' },
              { value: 'price-high', label: 'Price: High → Low' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortBy(opt.value)}
                className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  sortBy === opt.value ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-stone-600 hover:bg-stone-50'
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
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1.5">LinkAndSmile</p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
                {selectedCategoryNames.length === 1
                  ? selectedCategoryNames[0]
                  : selectedOrigins.includes("made-in-india") && selectedOrigins.length === 1
                  ? "🇮🇳 Made in India"
                  : selectedOrigins.includes("foreign-made") && selectedOrigins.length === 1
                  ? "🌍 International Products"
                  : "All Products"}
              </h1>
              <p className="text-sm text-stone-400 mt-1">
                {loading ? "Loading…" : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""} from our curated collection`}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <div className="hidden sm:flex flex-wrap gap-2">
                {searchQuery && (
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-100">
                    "{searchQuery}" <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedCategoryNames.map((name, i) => (
                  <span key={i} className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-100">
                    {name} <button onClick={() => toggleCategory(selectedCategories[i])}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {selectedOrigins.map(o => {
                  const found = ORIGINS.find(x => x.value === o);
                  return found ? (
                    <span key={o} className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-100">
                      {found.emoji} {found.label} <button onClick={() => toggleOrigin(o)}><X className="w-3 h-3" /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">

        {/* Top bar */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-3 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(v => !v)}
            className="sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 bg-stone-50 hover:bg-stone-100 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-stone-200 focus:ring-amber-300 focus:border-amber-300 text-sm bg-stone-50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="hidden sm:block">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-48 rounded-xl border-stone-200 text-sm bg-stone-50 focus:ring-amber-300">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-stone-200">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low → High</SelectItem>
                <SelectItem value="price-high">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="hidden md:flex items-center text-xs text-stone-400 font-medium shrink-0 whitespace-nowrap">
            {loading ? "…" : `${filteredProducts.length} results`}
          </span>
        </div>

        <div className="flex gap-6 items-start">

          {/* Desktop sidebar */}
          <div className="hidden md:block w-56 shrink-0 bg-white rounded-2xl border border-stone-100 shadow-sm p-5 sticky top-24">
            <Sidebar />
          </div>

          {/* Mobile sidebar drawer */}
          {mobileSidebarOpen && (
            <div className="md:hidden fixed inset-0 z-40 flex">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
              <div className="relative ml-auto w-72 max-w-full bg-white h-full shadow-2xl p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-stone-800">Filters</span>
                  <button onClick={() => setMobileSidebarOpen(false)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Sidebar />
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
                >
                  Show {filteredProducts.length} Results
                </button>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white border border-stone-100 overflow-hidden">
                    <div className="aspect-square bg-stone-100 animate-pulse" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 bg-stone-100 animate-pulse rounded-lg w-3/4" />
                      <div className="h-3 bg-stone-100 animate-pulse rounded-lg w-1/2" />
                      <div className="h-8 bg-stone-100 animate-pulse rounded-xl mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product, i) => (
                  <div
                    key={product._id}
                    style={{ opacity: 0, animation: `productFadeIn 0.3s ease forwards`, animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    <ProductCard
                      id={product._id} name={product.name} price={product.price}
                      discountPrice={product.discountPrice} image={product.image}
                      slug={product.slug} stock={product.stock}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-stone-200">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-stone-300" />
                </div>
                <h3 className="text-base font-bold text-stone-700 mb-1">No products found</h3>
                <p className="text-sm text-stone-400 text-center max-w-xs mb-5">
                  Try adjusting your filters or search term.
                </p>
                <button onClick={clearAll} className="text-sm font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2">
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes productFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}