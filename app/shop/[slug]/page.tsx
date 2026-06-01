// app/shop/[slug]/page.tsx
import { connectDB } from "@/lib/db"
import Shop from "@/lib/models/shop"
import { Product } from "@/lib/models/product"
import { ProductCard } from "@/components/product-card"
import Image from "next/image"
import Link from "next/link"
import { Star, Globe, Phone, Mail, MapPin, Package, ArrowLeft, ShieldCheck } from "lucide-react"
import { notFound } from "next/navigation"
import SellerFavouriteButton from "@/components/SellerFavouriteButton"


async function getShopData(slug: string) {
  await connectDB()

  const shop = await Shop.findOne({ slug, isActive: true, isApproved: true }).lean() as any
  if (!shop) return null

  const products = await Product.find({
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
    .lean() as any[]

  return {
    shop: JSON.parse(JSON.stringify(shop)),
    products: JSON.parse(JSON.stringify(products)),
  }
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getShopData(slug)

  if (!data) notFound()

  const { shop, products } = data
  const initials = shop.shopName?.slice(0, 2)?.toUpperCase() ?? "SH"

  // Origin breakdown
  const madeInIndia = products.filter((p: any) => p.origin === "made-in-india").length
  const international = products.filter((p: any) => p.origin === "foreign-made").length

  return (
    <main className="min-h-screen bg-stone-50">

      {/* Cover / Banner */}
      <div className="relative h-44 md:h-60 w-full overflow-hidden bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100">
        {shop.coverImage && (
          <Image src={shop.coverImage} alt={shop.shopName} fill className="object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-4 left-4">
          <Link
            href="/products"
            className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-stone-700 text-sm font-medium px-3 py-1.5 rounded-xl shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </Link>
        </div>
      </div>

      {/* Shop Identity Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-5 md:p-7 -mt-12 relative z-10 flex flex-col md:flex-row gap-5 md:items-end">

          {/* Logo */}
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-amber-50 shrink-0 -mt-10 md:-mt-14">
            {shop.logo ? (
              <Image src={shop.logo} alt={shop.shopName} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-amber-600">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">

            <div className="flex flex-wrap items-center gap-2 mb-1">
  <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
    {shop.shopName}
  </h1>
  {shop.isApproved && (
    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
      <ShieldCheck className="w-3.5 h-3.5" /> Verified Seller
    </span>
  )}
  {/* Favourite this seller */}
  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full px-2.5 py-1">
    <SellerFavouriteButton shopId={shop._id} />
    <span className="text-xs text-stone-500 font-medium">Save Seller</span>
  </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500">
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4 text-amber-400" />
                {products.length} Products
              </span>
              {shop.ratings?.count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {shop.ratings.average.toFixed(1)} ({shop.ratings.count} reviews)
                </span>
              )}
              {shop.address?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  {shop.address.city}, {shop.address.state}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 shrink-0">
            {madeInIndia > 0 && (
              <div className="text-center bg-orange-50 border border-orange-100 rounded-xl px-4 py-2">
                <p className="text-lg">🇮🇳</p>
                <p className="text-xs font-bold text-orange-700">{madeInIndia}</p>
                <p className="text-[10px] text-orange-500 font-medium">Made in India</p>
              </div>
            )}
            {international > 0 && (
              <div className="text-center bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                <p className="text-lg">🌍</p>
                <p className="text-xs font-bold text-blue-700">{international}</p>
                <p className="text-[10px] text-blue-500 font-medium">International</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">

          {/* Products grid */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-stone-800">All Products</h2>
              <span className="text-sm text-stone-400 font-medium">{products.length} items</span>
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-stone-200">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-stone-300" />
                </div>
                <p className="font-bold text-stone-600 mb-1">No products yet</p>
                <p className="text-sm text-stone-400">This seller hasn't listed any products.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
              <h3 className="font-bold text-base text-stone-800 mb-3">About this Seller</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                {shop.description || "No description provided."}
              </p>
              <div className="mt-4 space-y-2.5 pt-4 border-t border-stone-100">
                {shop.contactInfo?.email && (
                  <div className="flex items-center gap-2.5 text-sm text-stone-500">
                    <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">{shop.contactInfo.email}</span>
                  </div>
                )}
                {shop.contactInfo?.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-stone-500">
                    <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{shop.contactInfo.phone}</span>
                  </div>
                )}
                {shop.address?.city && (
                  <div className="flex items-center gap-2.5 text-sm text-stone-500">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{shop.address.city}, {shop.address.state} {shop.address.pincode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trust badge */}
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <h4 className="font-bold text-sm">LinkAndSmile Trusted</h4>
              </div>
              <p className="text-xs text-white/85 leading-relaxed">
                This seller is verified and approved by LinkAndSmile. Shop with confidence.
              </p>
            </div>

            {/* Browse more */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
              <h3 className="font-bold text-sm text-stone-700 mb-3">Browse More</h3>
              <div className="flex flex-col gap-1.5">
                <Link href="/products" className="text-sm text-stone-600 hover:text-amber-700 transition-colors px-1 py-1">
                  🛍️ All Products
                </Link>
                <Link href="/products?origin=made-in-india" className="text-sm text-stone-600 hover:text-amber-700 transition-colors px-1 py-1">
                  🇮🇳 Made in India
                </Link>
                <Link href="/products?origin=foreign-made" className="text-sm text-stone-600 hover:text-amber-700 transition-colors px-1 py-1">
                  🌍 International
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}