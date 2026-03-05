import { notFound } from "next/navigation"
import { ProductCard } from "@/components/product-card"

const CATEGORY_LABELS: Record<string, string> = {
  "organic-products": "🌿 Organic Products",
  "handmade-items": "🏠 Handmade Items",
  "fashion-apparel": "👗 Fashion & Apparel",
  "home-living": "🏡 Home & Living",
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const label = CATEGORY_LABELS[params.slug]
  if (!label) notFound()

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{label}</h1>
      <p className="text-gray-500">Browse our {label.replace(/^.{2}\s/, "")} collection.</p>
      {/* TODO: fetch and render products filtered by this category */}
    </main>
  )
}

export function generateStaticParams() {
  return [
    { slug: "organic-products" },
    { slug: "handmade-items" },
    { slug: "fashion-apparel" },
    { slug: "home-living" },
  ]
}