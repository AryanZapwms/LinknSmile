import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

const CATEGORY_SLUG_KEYS: Record<string, string> = {
  "organic-products": "organicProducts",
  "handmade-items": "handmadeItems",
  "fashion-apparel": "fashionApparel",
  "home-living": "homeLiving",
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const labelKey = CATEGORY_SLUG_KEYS[slug];
  if (!labelKey) notFound();

  const tFooter = await getTranslations("Footer.categoryLabels");
  const t = await getTranslations("CategoryPage");
  const label = tFooter(labelKey as "organicProducts");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{label}</h1>
      <p className="text-gray-500">{t("browseCollection", { category: label })}</p>
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
