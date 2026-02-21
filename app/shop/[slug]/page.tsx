import { connectDB } from "@/lib/db"
import { Company } from "@/lib/models/company"
import { Product } from "@/lib/models/product"
import { Review } from "@/lib/models/review"
import { ProductCard } from "@/components/product-card"
import Image from "next/image"
import { Star, MapPin, Globe, Phone, Mail } from "lucide-react"
import { notFound } from "next/navigation"

async function getShopData(slug: string) {
  await connectDB()
  
  const company = await Company.findOne({ slug, isActive: true }).lean()
  if (!company) return null

  const companyId = (company as any)._id

  // Fetch products
  const products = await Product.find({ company: companyId }).lean()

  // Fetch all approved reviews for this company's products to calculate shop rating
  const reviews = await Review.find({ company: companyId, status: 'APPROVED' }).lean()
  
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
    : 0

  return {
    company: JSON.parse(JSON.stringify(company)),
    products: JSON.parse(JSON.stringify(products)),
    stats: {
      totalReviews,
      averageRating: Number(averageRating.toFixed(1))
    }
  }
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getShopData(slug)

  if (!data) {
    notFound()
  }

  const { company, products, stats } = data

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* Banner */}
      <div className="relative h-48 md:h-64 lg:h-80 w-full overflow-hidden">
        {company.banner ? (
          <Image 
            src={company.banner} 
            alt={company.name} 
            fill 
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-100 to-blue-100" />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Shop Info Header */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-end">
          <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-white -mt-12 md:mt-0">
             {company.logo ? (
                <Image src={company.logo} alt={company.name} fill className="object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted text-2xl font-bold uppercase text-muted-foreground line-clamp-1">
                    {company.name.slice(0, 2)}
                </div>
             )}
          </div>
          
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{company.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                <Star className="w-4 h-4 fill-purple-700" />
                {stats.averageRating} ({stats.totalReviews} reviews)
              </div>
              {company.website && (
                <a href={company.website} target="_blank" className="flex items-center gap-1 hover:text-purple-600 transition-colors">
                  <Globe className="w-4 h-4" /> {new URL(company.website).hostname}
                </a>
              )}
              {company.phone && (
                <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {company.phone}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
            {/* Products Grid */}
            <section className="space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Products</h2>
                    <p className="text-gray-500">{products.length} Items</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {products.map((p: any) => (
                        <ProductCard
                            key={p._id}
                            id={p._id}
                            name={p.name}
                            price={p.price}
                            discountPrice={p.discountPrice}
                            image={p.image}
                            slug={p.slug}
                        />
                    ))}
                </div>
            </section>

            {/* Sidebar / About */}
            <aside className="space-y-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-gray-100">
                    <h3 className="font-bold text-lg text-gray-900">About the Brand</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        {company.description || "No description available for this vendor."}
                    </p>
                    <div className="pt-4 space-y-3 border-t">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-purple-500" />
                            <span>{company.email || "Contact via portal"}</span>
                        </div>
                    </div>
                </div>
                
                {/* Trusted Badge Placeholder */}
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-200">
                    <h4 className="font-bold flex items-center gap-2">
                        <Star className="w-5 h-5 fill-white" /> 
                        LinkAndSmile Trusted
                    </h4>
                    <p className="text-xs text-white/80 mt-2">
                        This vendor has been verified by LinkAndSmile for product quality and customer service excellence.
                    </p>
                </div>
            </aside>
        </div>
      </div>
    </main>
  )
}
