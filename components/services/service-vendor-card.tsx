// components/services/service-vendor-card.tsx
//
// One vendor on the /services page: a picture from their newest post (or
// their logo), logo, shop name, city and category. Opens their shop page.
// Takes its text as props, so the server page and the client "Load more"
// list can both render it.
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { ServicesVendorCard } from "@/lib/services-page";

interface ServiceVendorCardProps {
  vendor: ServicesVendorCard;
  /** Shown as a badge when the vendor is one of the featured ones. */
  featuredLabel?: string;
}

export function ServiceVendorCard({ vendor, featuredLabel }: ServiceVendorCardProps) {
  const initials = vendor.shopName?.slice(0, 2)?.toUpperCase() || "SH";
  const logo = (size: "small" | "large") =>
    vendor.logo ? (
      <Image
        src={vendor.logo}
        alt=""
        fill
        sizes={size === "small" ? "40px" : "96px"}
        className="object-cover"
      />
    ) : (
      <span
        className={`flex h-full w-full items-center justify-center font-bold text-amber-600 ${size === "small" ? "text-sm" : "text-2xl"}`}
      >
        {initials}
      </span>
    );

  return (
    <Link
      href={`/shop/${vendor.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white transition-all duration-200 hover:border-amber-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-50 via-stone-50 to-stone-100">
        {vendor.picture ? (
          <Image
            src={vendor.picture}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          // No post picture yet: the logo or initials, large.
          <div className="flex h-full w-full items-center justify-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-amber-50 shadow-sm">
              {logo("large")}
            </div>
          </div>
        )}
        {featuredLabel && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white shadow">
            <Star className="h-3 w-3 fill-white" /> {featuredLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 p-4">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
          {logo("small")}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-stone-900 transition-colors group-hover:text-amber-700">
            {vendor.shopName}
          </h3>
          <p className="flex min-w-0 items-center gap-1 truncate text-xs text-stone-500">
            {vendor.city && (
              <>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{vendor.city}</span>
              </>
            )}
            {vendor.city && vendor.category && <span aria-hidden="true">·</span>}
            {vendor.category && <span className="truncate">{vendor.category.name}</span>}
          </p>
        </div>
      </div>
    </Link>
  );
}
