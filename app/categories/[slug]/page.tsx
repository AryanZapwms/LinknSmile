import { notFound } from "next/navigation";

const CATEGORY_LABELS: Record<string, string> = {
  "organic-products": "Organic Products",
  "handmade-items": "Handmade Items",
  "fashion-apparel": "Fashion & Apparel",
  "home-living": "Home & Living",
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const label = CATEGORY_LABELS[slug];
  if (!label) notFound();
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{label}</h1>
      <p className="text-gray-500">Browse our {label.replace(/^.{2}\s/, "")} collection.</p>
      {/* TODO: fetch and render products filtered by this category */}
    </main>
  );
}

export function generateStaticParams() {
  return [
    { slug: "organic-products" },
    { slug: "handmade-items" },
    { slug: "fashion-apparel" },
    { slug: "home-living" },
  ];
}
