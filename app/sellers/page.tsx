// app/sellers/page.tsx
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Package, Star, MapPin, ArrowRight } from "lucide-react";
import SellerFavouriteButton from "@/components/SellerFavouriteButton";

async function getShops() {
  await connectDB();
  const shops = await Shop.find({ isApproved: true, isActive: true })
    .select("shopName slug logo description address ratings stats")
    .sort({ "stats.totalOrders": -1, createdAt: -1 })
    .lean();
  return JSON.parse(JSON.stringify(shops));
}

export const metadata = {
  title: "All Sellers | LinkAndSmile",
  description: "Discover verified sellers on LinkAndSmile — India's marketplace",
};

export default async function SellersPage() {
  const shops = await getShops();

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">
              LinkAndSmile Marketplace
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
            Our Sellers
          </h1>
          <p className="max-w-xl text-base text-stone-500">
            Browse verified sellers and discover unique products from across India. Every seller is
            reviewed and approved by our team.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {shops.length} Verified Sellers
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        {shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
              <ShieldCheck className="h-8 w-8 text-amber-300" />
            </div>
            <p className="mb-1 text-lg font-bold text-stone-600">No sellers yet</p>
            <p className="text-sm text-stone-400">
              Be the first to{" "}
              <Link href="/register-as-seller" className="text-amber-600 hover:underline">
                sell on LinkAndSmile
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop: any) => {
              const initials = shop.shopName?.slice(0, 2)?.toUpperCase() ?? "SH";
              return (
                <Link
                  key={shop._id}
                  href={`/shop/${shop.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white transition-all duration-200 hover:border-amber-200 hover:shadow-md"
                >
                  <SellerFavouriteButton shopId={shop._id} />

                  {/* Top accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="flex-1 p-5">
                    <div className="mb-4 flex items-start gap-4">
                      {/* Logo */}
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
                        {shop.logo ? (
                          <Image
                            src={shop.logo}
                            alt={shop.shopName}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-amber-600">{initials}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <h2 className="truncate text-base font-bold text-stone-900 transition-colors group-hover:text-amber-700">
                            {shop.shopName}
                          </h2>
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        </div>
                        {shop.address?.city && (
                          <p className="flex items-center gap-1 text-xs text-stone-400">
                            <MapPin className="h-3 w-3" />
                            {shop.address.city}, {shop.address.state}
                          </p>
                        )}
                      </div>
                    </div>

                    {shop.description && (
                      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-stone-500">
                        {shop.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 border-t border-stone-100 pt-3 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-amber-400" />
                        {shop.stats?.totalProducts ?? 0} products
                      </span>
                      {shop.ratings?.count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {shop.ratings.average.toFixed(1)} ({shop.ratings.count})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-600 transition-colors group-hover:text-amber-700">
                      <span>Visit Shop</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-stone-100 bg-white px-8 py-6">
            <p className="font-medium text-stone-600">Want to sell on LinkAndSmile?</p>
            <Link
              href="/register-as-seller"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Become a Seller <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
