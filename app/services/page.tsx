// app/services/page.tsx
//
// /services — vendors whose store type is Services or Both: a category
// filter, the featured vendors (admin's order), the rest a page at a time,
// and "Latest work" from their posts. Data: lib/services-page.ts. Settings:
// /admin/services. While the admin switch is off the page is "not found",
// except for admins, who see it as a preview.
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Briefcase, Eye } from "lucide-react";
import { getServicesPageData, servicesPageAccess } from "@/lib/services-page";
import { ServiceVendorCard } from "@/components/services/service-vendor-card";
import { ServicesVendorList } from "@/components/services/services-vendor-list";

export async function generateMetadata() {
  const t = await getTranslations("ServicesPage");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const access = await servicesPageAccess();
  if (!access.visible) notFound();

  const { category } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("ServicesPage");
  const data = await getServicesPageData({
    categorySlug: typeof category === "string" ? category : null,
    locale,
  });
  const { categories, activeCategory, featured, vendors, nextPage, latestWork } = data;
  const nothingListed = featured.length === 0 && vendors.length === 0;

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-amber-500 bg-amber-500 text-white"
          : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-700"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <main className="min-h-screen bg-stone-50">
      {access.preview && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 text-sm text-amber-800 sm:px-6">
            <Eye className="h-4 w-4 shrink-0" /> {t("previewBanner")}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-stone-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">{t("eyebrow")}</span>
          <h1 className="mt-1 mb-2 text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">{t("heading")}</h1>
          <p className="max-w-xl text-base text-stone-500">{t("subtitle")}</p>

          {categories.length > 0 && (
            <nav aria-label={t("categoryFilterLabel")} className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {chip("/services", t("all"), !activeCategory)}
              {categories.map((c) => chip(`/services?category=${encodeURIComponent(c.slug)}`, c.name, activeCategory?._id === c._id))}
            </nav>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 md:py-12">
        {nothingListed ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
              <Briefcase className="h-8 w-8 text-amber-300" />
            </div>
            <p className="mb-1 text-lg font-bold text-stone-600">
              {activeCategory ? t("noVendorsInCategory", { category: activeCategory.name }) : t("noVendorsTitle")}
            </p>
            <p className="text-sm text-stone-400">{t("noVendorsBody")}</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section aria-labelledby="services-featured">
                <h2 id="services-featured" className="mb-5 text-xl font-bold text-stone-800">
                  {t("featuredTitle")}
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((vendor) => (
                    <ServiceVendorCard key={vendor._id} vendor={vendor} featuredLabel={t("featuredBadge")} />
                  ))}
                </div>
              </section>
            )}

            {vendors.length > 0 && (
              <section aria-labelledby="services-all">
                <h2 id="services-all" className="mb-5 text-xl font-bold text-stone-800">
                  {activeCategory ? activeCategory.name : t("allVendorsTitle")}
                </h2>
                <ServicesVendorList
                  key={activeCategory?.slug ?? "all"}
                  initialVendors={vendors}
                  initialNextPage={nextPage}
                  categorySlug={activeCategory?.slug ?? null}
                />
              </section>
            )}
          </>
        )}

        {/* Latest work: each opens the post on its shop page. */}
        {latestWork.length > 0 && (
          <section aria-labelledby="services-latest-work">
            <h2 id="services-latest-work" className="mb-5 text-xl font-bold text-stone-800">
              {t("latestWorkTitle")}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {latestWork.map((post) => (
                <li key={post._id}>
                  <Link
                    href={`/shop/${post.shopSlug}?post=${post._id}`}
                    className="group relative block aspect-square overflow-hidden rounded-xl bg-stone-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Image
                      src={post.picture}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 300px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-start">
                      <span className="line-clamp-1 text-sm font-semibold text-white">{post.title}</span>
                      <span className="line-clamp-1 text-xs text-white/80">{t("latestWorkBy", { shop: post.shopName })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
