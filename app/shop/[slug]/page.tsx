// app/shop/[slug]/page.tsx
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { Product } from "@/lib/models/product";
import { ProductCard } from "@/components/product-card";
import Image from "next/image";
import Link from "next/link";
import { Star, Globe, Phone, Mail, MapPin, Package, ArrowLeft, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import SellerFavouriteButton from "@/components/SellerFavouriteButton";

async function getShopData(slug: string) {
  await connectDB();

  const shop = (await Shop.findOne({ slug, isActive: true, isApproved: true }).lean()) as any;
  if (!shop) return null;

  const products = (await Product.find({
    shopId: shop._id,
    isActive: true,
    $or: [
      { approvalStatus: "approved" },
      { approvalStatus: { $exists: false } },
      { approvalStatus: null },
    ],
  })
    .populate("category", "name slug")
    .select("name slug price discountPrice image images stock category origin")
    .sort({ createdAt: -1 })
    .lean()) as any[];

  return {
    shop: JSON.parse(JSON.stringify(shop)),
    products: JSON.parse(JSON.stringify(products)),
  };
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getShopData(slug);

  if (!data) notFound();

  const { shop, products } = data;
  const initials = shop.shopName?.slice(0, 2)?.toUpperCase() ?? "SH";

  // Origin breakdown
  const madeInIndia = products.filter((p: any) => p.origin === "made-in-india").length;
  const international = products.filter((p: any) => p.origin === "foreign-made").length;

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Cover / Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 md:h-60">
        {shop.coverImage && (
          <Image
            src={shop.coverImage}
            alt={shop.shopName}
            fill
            className="object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-4 left-4">
          <Link
            href="/products"
            className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>
        </div>
      </div>

      {/* Shop Identity Card */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative z-10 -mt-12 flex flex-col gap-5 rounded-2xl border border-stone-100 bg-white p-5 shadow-lg md:flex-row md:items-end md:p-7">
          {/* Logo */}
          <div className="relative -mt-10 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-amber-50 shadow-md md:-mt-14 md:h-24 md:w-24">
            {shop.logo ? (
              <Image src={shop.logo} alt={shop.shopName} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-amber-600">
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
                {shop.shopName}
              </h1>
              {shop.isApproved && (
                <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Seller
                </span>
              )}
              {/* Favourite this seller */}
              <div className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1">
                <SellerFavouriteButton shopId={shop._id} />
                <span className="text-xs font-medium text-stone-500">Save Seller</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500">
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4 text-amber-400" />
                {products.length} Products
              </span>
              {shop.ratings?.count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {shop.ratings.average.toFixed(1)} ({shop.ratings.count} reviews)
                </span>
              )}
              {shop.address?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  {shop.address.city}, {shop.address.state}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex shrink-0 gap-3">
            {madeInIndia > 0 && (
              <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-center">
                <p className="text-lg">🇮🇳</p>
                <p className="text-xs font-bold text-orange-700">{madeInIndia}</p>
                <p className="text-[10px] font-medium text-orange-500">Made in India</p>
              </div>
            )}
            {international > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center">
                <p className="text-lg">🌍</p>
                <p className="text-xs font-bold text-blue-700">{international}</p>
                <p className="text-[10px] font-medium text-blue-500">International</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          {/* Products grid */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-800">All Products</h2>
              <span className="text-sm font-medium text-stone-400">{products.length} items</span>
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white py-20">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
                  <Package className="h-7 w-7 text-stone-300" />
                </div>
                <p className="mb-1 font-bold text-stone-600">No products yet</p>
                <p className="text-sm text-stone-400">This seller hasn't listed any products.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {products.map((p: any) => (
                  <ProductCard
                    key={p._id}
                    id={p._id}
                    name={p.name}
                    price={p.price}
                    discountPrice={p.discountPrice}
                    image={p.image}
                    slug={p.slug}
                    stock={p.stock}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* About */}
            <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-bold text-stone-800">About this Seller</h3>
              <p className="text-sm leading-relaxed text-stone-500">
                {shop.description || "No description provided."}
              </p>
              <div className="mt-4 space-y-2.5 border-t border-stone-100 pt-4">
                {shop.contactInfo?.email && (
                  <div className="flex items-center gap-2.5 text-sm text-stone-500">
                    <Mail className="h-4 w-4 shrink-0 text-amber-400" />
                    <span className="truncate">{shop.contactInfo.email}</span>
                  </div>
                )}
                {shop.contactInfo?.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-stone-500">
                    <Phone className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>{shop.contactInfo.phone}</span>
                  </div>
                )}
                {shop.address?.city && (
                  <div className="flex items-center gap-2.5 text-sm text-stone-500">
                    <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      {shop.address.city}, {shop.address.state} {shop.address.pincode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Trust badge */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-5 text-white shadow-lg shadow-amber-100">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <h4 className="text-sm font-bold">LinkAndSmile Trusted</h4>
              </div>
              <p className="text-xs leading-relaxed text-white/85">
                This seller is verified and approved by LinkAndSmile. Shop with confidence.
              </p>
            </div>

            {/* Browse more */}
            <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-stone-700">Browse More</h3>
              <div className="flex flex-col gap-1.5">
                <Link
                  href="/products"
                  className="px-1 py-1 text-sm text-stone-600 transition-colors hover:text-amber-700"
                >
                  🛍️ All Products
                </Link>
                <Link
                  href="/products?origin=made-in-india"
                  className="px-1 py-1 text-sm text-stone-600 transition-colors hover:text-amber-700"
                >
                  🇮🇳 Made in India
                </Link>
                <Link
                  href="/products?origin=foreign-made"
                  className="px-1 py-1 text-sm text-stone-600 transition-colors hover:text-amber-700"
                >
                  🌍 International
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
