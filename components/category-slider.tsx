// components/category-slider.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
}

// Warm, earthy accent palette — cycles through categories
const FALLBACK_PALETTES = [
  { bg: "from-amber-100 to-orange-50", text: "text-amber-700", letter: "text-amber-500" },
  { bg: "from-rose-100 to-pink-50", text: "text-rose-700", letter: "text-rose-400" },
  { bg: "from-teal-100 to-emerald-50", text: "text-teal-700", letter: "text-teal-500" },
  { bg: "from-sky-100 to-blue-50", text: "text-sky-700", letter: "text-sky-500" },
  { bg: "from-violet-100 to-purple-50", text: "text-violet-700", letter: "text-violet-400" },
  { bg: "from-lime-100 to-green-50", text: "text-lime-700", letter: "text-lime-600" },
  { bg: "from-orange-100 to-amber-50", text: "text-orange-700", letter: "text-orange-500" },
];

function CategorySkeleton() {
  return (
    <div className="flex w-[90px] flex-shrink-0 flex-col items-center gap-2.5 md:w-[108px]">
      <div className="h-[90px] w-[90px] animate-pulse rounded-2xl bg-stone-100 md:h-[108px] md:w-[108px]" />
      <div className="h-3 w-16 animate-pulse rounded-full bg-stone-100" />
    </div>
  );
}

export function CategorySlider() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories?flat=true")
      .then((r) => r.json())
      .then((data) =>
        setCategories(Array.isArray(data) ? data.filter((c: any) => c.isActive !== false) : [])
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!loading && categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 md:text-2xl">
            Shop by Category
          </h2>
          <p className="mt-0.5 text-xs font-medium text-stone-400">
            Find exactly what you're looking for
          </p>
        </div>
        <Link
          href="/products"
          className="group flex items-center gap-1 text-sm font-medium text-amber-600 transition-colors hover:text-amber-700"
        >
          View all
          <ChevronRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Scrollable strip */}
      <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 md:gap-4">
        {loading
          ? [...Array(7)].map((_, i) => <CategorySkeleton key={i} />)
          : categories.map((cat, i) => {
              const palette = FALLBACK_PALETTES[i % FALLBACK_PALETTES.length];
              return (
                <Link
                  key={cat._id}
                  href={`/products?category=${cat._id}`}
                  className="group flex flex-shrink-0 snap-start flex-col items-center gap-2.5"
                  style={{
                    opacity: 0,
                    animation: `categoryFadeIn 0.35s ease forwards`,
                    animationDelay: `${i * 45}ms`,
                  }}
                >
                  {/* Card image */}
                  <div className="relative h-[90px] w-[90px] overflow-hidden rounded-2xl ring-1 ring-stone-200/80 transition-all duration-250 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-amber-300 md:h-[108px] md:w-[108px]">
                    {cat.image ? (
                      <>
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          className="object-cover transition-transform duration-400 group-hover:scale-[1.06]"
                        />
                        {/* Frosted label bar */}
                        <div className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-white/70 px-1.5 backdrop-blur-md">
                          <span className="w-full truncate text-center text-[10px] leading-none font-semibold text-stone-700">
                            {cat.name}
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Colour fallback — no image */
                      <div
                        className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${palette.bg}`}
                      >
                        <span className={`text-3xl leading-none font-bold ${palette.letter}`}>
                          {cat.name[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Label — only shown when there is no image (image cards have it inset) */}
                  {!cat.image && (
                    <span
                      className={`line-clamp-1 max-w-[90px] text-center text-xs font-medium transition-colors duration-200 md:max-w-[108px] ${palette.text} group-hover:opacity-80`}
                    >
                      {cat.name}
                    </span>
                  )}
                  {cat.image && (
                    /* Invisible spacer to keep grid heights consistent */
                    <span className="text-xs opacity-0 select-none" aria-hidden>
                      ‍
                    </span>
                  )}
                </Link>
              );
            })}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes categoryFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
