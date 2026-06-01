// components/category-slider.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"

interface Category {
  _id: string
  name: string
  slug: string
  image?: string
}

// Warm, earthy accent palette — cycles through categories
const FALLBACK_PALETTES = [
  { bg: "from-amber-100 to-orange-50", text: "text-amber-700", letter: "text-amber-500" },
  { bg: "from-rose-100 to-pink-50",   text: "text-rose-700",  letter: "text-rose-400"  },
  { bg: "from-teal-100 to-emerald-50",text: "text-teal-700",  letter: "text-teal-500"  },
  { bg: "from-sky-100 to-blue-50",    text: "text-sky-700",   letter: "text-sky-500"   },
  { bg: "from-violet-100 to-purple-50",text:"text-violet-700",letter: "text-violet-400" },
  { bg: "from-lime-100 to-green-50",  text: "text-lime-700",  letter: "text-lime-600"  },
  { bg: "from-orange-100 to-amber-50",text: "text-orange-700",letter: "text-orange-500" },
]

function CategorySkeleton() {
  return (
    <div className="flex-shrink-0 w-[90px] md:w-[108px] flex flex-col items-center gap-2.5">
      <div className="w-[90px] h-[90px] md:w-[108px] md:h-[108px] rounded-2xl bg-stone-100 animate-pulse" />
      <div className="h-3 w-16 rounded-full bg-stone-100 animate-pulse" />
    </div>
  )
}

export function CategorySlider() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/categories?flat=true")
      .then((r) => r.json())
      .then((data) => setCategories( Array.isArray(data) ? data.filter((c: any) => c.isActive !== false) : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (!loading && categories.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">Shop by Category</h2>
          <p className="text-xs text-stone-400 mt-0.5 font-medium">Find exactly what you're looking for</p>
        </div>
        <Link
          href="/products"
          className="group flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
        >
          View all
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
        </Link>
      </div>

      {/* Scrollable strip */}
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
        {loading
          ? [...Array(7)].map((_, i) => <CategorySkeleton key={i} />)
          : categories.map((cat, i) => {
              const palette = FALLBACK_PALETTES[i % FALLBACK_PALETTES.length]
              return (
                <Link
                  key={cat._id}
                  href={`/products?category=${cat._id}`}
                  className="flex-shrink-0 snap-start flex flex-col items-center gap-2.5 group"
                  style={{
                    opacity: 0,
                    animation: `categoryFadeIn 0.35s ease forwards`,
                    animationDelay: `${i * 45}ms`,
                  }}
                >
                  {/* Card image */}
                  <div className="relative w-[90px] h-[90px] md:w-[108px] md:h-[108px] rounded-2xl overflow-hidden ring-1 ring-stone-200/80 group-hover:ring-amber-300 group-hover:shadow-md transition-all duration-250 group-hover:-translate-y-0.5">
                    {cat.image ? (
                      <>
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          className="object-cover group-hover:scale-[1.06] transition-transform duration-400"
                        />
                        {/* Frosted label bar */}
                        <div className="absolute bottom-0 inset-x-0 h-7 bg-white/70 backdrop-blur-md flex items-center justify-center px-1.5">
                          <span className="text-[10px] font-semibold text-stone-700 truncate leading-none text-center w-full">
                            {cat.name}
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Colour fallback — no image */
                      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${palette.bg}`}>
                        <span className={`text-3xl font-bold leading-none ${palette.letter}`}>
                          {cat.name[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Label — only shown when there is no image (image cards have it inset) */}
                  {!cat.image && (
                    <span className={`text-xs font-medium transition-colors duration-200 text-center line-clamp-1 max-w-[90px] md:max-w-[108px] ${palette.text} group-hover:opacity-80`}>
                      {cat.name}
                    </span>
                  )}
                  {cat.image && (
                    /* Invisible spacer to keep grid heights consistent */
                    <span className="text-xs opacity-0 select-none" aria-hidden>‍</span>
                  )}
                </Link>
              )
            })}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes categoryFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}