// components/services/services-vendor-list.tsx
//
// The general vendor list of /services: the first page comes from the
// server (lib/services-page.ts), "Load more" adds the next one from
// /api/services/vendors. The page gives this a different key per category,
// so choosing a category starts a fresh list.
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ServiceVendorCard } from "@/components/services/service-vendor-card";
import type { ServicesVendorCard } from "@/lib/services-page";

interface ServicesVendorListProps {
  initialVendors: ServicesVendorCard[];
  initialNextPage: number | null;
  categorySlug: string | null;
}

export function ServicesVendorList({ initialVendors, initialNextPage, categorySlug }: ServicesVendorListProps) {
  const t = useTranslations("ServicesPage");
  const [vendors, setVendors] = useState(initialVendors);
  const [nextPage, setNextPage] = useState(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadMore = async () => {
    if (!nextPage || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (categorySlug) params.set("category", categorySlug);
      const res = await fetch(`/api/services/vendors?${params}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.vendors)) throw new Error("load more failed");
      setVendors((prev) => {
        const seen = new Set(prev.map((v) => v._id));
        return [...prev, ...data.vendors.filter((v: ServicesVendorCard) => !seen.has(v._id))];
      });
      setNextPage(data.nextPage ?? null);
    } catch (error) {
      console.error("Failed to load more vendors:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <ServiceVendorCard key={vendor._id} vendor={vendor} />
        ))}
      </div>
      {nextPage && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            {loading ? t("loadingMore") : t("loadMore")}
          </button>
          {failed && <p className="text-sm text-red-600">{t("loadMoreFailed")}</p>}
        </div>
      )}
    </>
  );
}
