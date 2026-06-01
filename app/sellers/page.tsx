// app/sellers/page.tsx
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Package, Star, MapPin, ArrowRight } from "lucide-react";

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
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500">
              LinkAndSmile Marketplace
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mb-2">
            Our Sellers
          </h1>
          <p className="text-stone-500 text-base max-w-xl">
            Browse verified sellers and discover unique products from across India.
            Every seller is reviewed and approved by our team.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-full border border-amber-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              {shops.length} Verified Sellers
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-stone-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-amber-300" />
            </div>
            <p className="font-bold text-stone-600 text-lg mb-1">No sellers yet</p>
            <p className="text-sm text-stone-400">
              Be the first to{" "}
              <Link href="/register-as-seller" className="text-amber-600 hover:underline">
                sell on LinkAndSmile
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shops.map((shop: any) => {
              const initials = shop.shopName?.slice(0, 2)?.toUpperCase() ?? "SH";
              return (
                <Link
                  key={shop._id}
                  href={`/shop/${shop.slug}`}
                  className="group bg-white rounded-2xl border border-stone-100 hover:border-amber-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* Top accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="p-5 flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Logo */}
                      <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden shrink-0">
                        {shop.logo ? (
                          <Image
                            src={shop.logo}
                            alt={shop.shopName}
                            width={56}
                            height={56}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-lg font-bold text-amber-600">
                            {initials}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h2 className="font-bold text-stone-900 text-base truncate group-hover:text-amber-700 transition-colors">
                            {shop.shopName}
                          </h2>
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </div>
                        {shop.address?.city && (
                          <p className="text-xs text-stone-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {shop.address.city}, {shop.address.state}
                          </p>
                        )}
                      </div>
                    </div>

                    {shop.description && (
                      <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 mb-4">
                        {shop.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-stone-400 pt-3 border-t border-stone-100">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        {shop.stats?.totalProducts ?? 0} products
                      </span>
                      {shop.ratings?.count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {shop.ratings.average.toFixed(1)} ({shop.ratings.count})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-600 group-hover:text-amber-700 transition-colors">
                      <span>Visit Shop</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-3 bg-white rounded-2xl border border-stone-100 px-8 py-6">
            <p className="text-stone-600 font-medium">Want to sell on LinkAndSmile?</p>
            <Link
              href="/register-as-seller"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Become a Seller <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}