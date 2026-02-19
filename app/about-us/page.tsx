"use client"

import React from "react"
import { Sparkles, Award, Shield, Heart, Users, ShoppingBag, Store, Leaf, Hand, Package, Truck, BadgeCheck, Phone, Mail, MapPin, Instagram, Facebook, Youtube, Globe, Target, Sun, Smile } from "lucide-react"

const values = [
  {
    icon: Shield,
    title: "Verified Sellers",
    description: "Shop with confidence from authenticated businesses and genuine sellers"
  },
  {
    icon: BadgeCheck,
    title: "Secure Payment Gateway",
    description: "Safe and secure online payments with multiple payment options"
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Quick shipping across India with reliable logistics partners"
  },
  {
    icon: Award,
    title: "Best Prices",
    description: "Competitive pricing on discount products, deals, offers, and wholesale rates"
  },
  {
    icon: Heart,
    title: "Customer Support",
    description: "Dedicated support for seamless online shopping experience"
  },
  {
    icon: Sparkles,
    title: "Quality Assurance",
    description: "Curated selection of quality products and authentic goods"
  }
]

const sellerBenefits = [
  {
    icon: Store,
    title: "Sell Online With Ease",
    description: "Start your online business on Linknsmile's seller-friendly platform. Whether you're a manufacturer, wholesaler, retailer, or home entrepreneur — list your products and reach customers nationwide."
  },
  {
    icon: Users,
    title: "B2B Marketplace",
    description: "Connect with bulk buyers, wholesalers, retailers, and business customers looking for wholesale products, bulk orders, and trade supplies."
  },
  {
    icon: Package,
    title: "Free Seller Registration",
    description: "Join thousands of sellers already growing their business on India's emerging multi-vendor marketplace."
  }
]

const categories = [
  "🌿 Organic Products",
  "🏠 Handmade Items",
  "👗 Fashion & Apparel",
  "🏡 Home & Living",
  "💄 Beauty & Personal Care",
  "🍽️ Food & Beverages",
  "📱 Electronics",
  "👶 Kids & Baby Products",
  "🎁 Gifts & Crafts",
  "🛠️ Business Supplies"
]

export default function AboutUs() {
  return (
    <section className="bg-gradient-to-b from-amber-50/50 to-white font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FDB241] via-[#FDB241] to-[#FFD966] py-24 px-6">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/30 backdrop-blur-sm px-6 py-2 rounded-full text-[#1A1A1A] font-semibold mb-6">
            <Store className="w-4 h-4" />
            Where Business Meets Community
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-[#1A1A1A] mb-6 tracking-tight">
            Welcome to <span className="text-[#1A1A1A] relative">
              Linknsmile
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-white/50 rounded-full"></span>
            </span>
          </h1>
          <p className="text-[#1A1A1A]/80 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-medium">
            India's trusted online marketplace connecting small businesses, local sellers, and conscious shoppers under one digital roof.
          </p>
          <div className="mt-8 inline-block bg-white/20 backdrop-blur-sm px-8 py-3 rounded-full text-[#1A1A1A] font-semibold">
            Net & Work Builds Up Net-Worth
          </div>
        </div>
      </div>

      {/* Who We Are */}
      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-10 mb-24">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-[#FDB241]/20">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="bg-[#FDB241]/20 p-4 rounded-2xl">
              <Users className="w-10 h-10 text-[#FDB241]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A]">Who We Are</h2>
          </div>
          <p className="text-[#4A4A4A] text-lg md:text-xl leading-relaxed text-center max-w-4xl mx-auto">
            Linknsmile is a revolutionary <span className="font-semibold text-[#FDB241]">B2B and B2C e-commerce platform</span> designed to empower local businesses, home-based entrepreneurs, and organic product sellers to reach customers across India. We are more than just an online shopping website — we are a community marketplace that celebrates handmade products, organic goods, and quality everyday essentials.
          </p>
          <p className="text-[#4A4A4A] text-lg text-center mt-6 italic">
            Whether you're a business owner looking to sell online or a customer searching for authentic, homemade products, Linknsmile is your perfect shopping destination.
          </p>
        </div>
      </div>

      {/* What We Offer - For Shoppers */}
      <div className="max-w-7xl mx-auto px-6 py-16 mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-[#1A1A1A] mb-16">
          What We <span className="text-[#FDB241]">Offer</span>
        </h2>
        
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-20">
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-[#FDB241]/20">
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-8 flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-[#FDB241]" />
              For Shoppers
            </h3>
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#FDB241]/20 rounded-xl flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-[#FDB241]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[#1A1A1A] mb-2">✨ Organic & Natural Products</h4>
                  <p className="text-[#4A4A4A]">Browse our extensive collection of organic food, natural skincare, chemical-free products, and eco-friendly items from verified sellers committed to sustainability.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#FDB241]/20 rounded-xl flex items-center justify-center">
                  <Hand className="w-6 h-6 text-[#FDB241]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[#1A1A1A] mb-2">🏠 Handmade & Home-Based Products</h4>
                  <p className="text-[#4A4A4A]">Discover unique handmade crafts, homemade food items, artisan products, and cottage industry goods made with love by women entrepreneurs and home business owners.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#FDB241]/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-[#FDB241]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[#1A1A1A] mb-2">🛒 Everyday Shopping</h4>
                  <p className="text-[#4A4A4A]">Shop from thousands of general merchandise, household items, electronics, fashion, home decor, and more — your complete online shopping solution.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#FDB241]/20 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-[#FDB241]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[#1A1A1A] mb-2">💚 Supporting Local Businesses</h4>
                  <p className="text-[#4A4A4A]">Every purchase on Linknsmile supports small businesses, local vendors, Indian sellers, and startup entrepreneurs building their dreams.</p>
                </div>
              </div>
            </div>
          </div>

          {/* For Sellers */}
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-[#FDB241]/20">
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-8 flex items-center gap-3">
              <Store className="w-8 h-8 text-[#FDB241]" />
              For Sellers
            </h3>
            <div className="space-y-8">
              {sellerBenefits.map((benefit, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#FDB241]/20 rounded-xl flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-[#FDB241]" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#1A1A1A] mb-2">{benefit.title}</h4>
                    <p className="text-[#4A4A4A]">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Linknsmile */}
      <div className="bg-gradient-to-r from-[#FDB241] to-[#FFD966] py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6">
              Why Choose <span className="text-white">Linknsmile?</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, idx) => {
              const Icon = value.icon
              return (
                <div 
                  key={idx}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 hover:bg-white transition-all duration-300 border border-white/50 hover:border-[#1A1A1A]/20 shadow-lg group"
                >
                  <div className="bg-[#FDB241]/20 p-4 rounded-xl inline-block mb-6 group-hover:bg-[#FDB241]/30 transition-colors">
                    <Icon className="w-8 h-8 text-[#FDB241]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{value.title}</h3>
                  <p className="text-[#4A4A4A] leading-relaxed">{value.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-gradient-to-br from-[#FDB241]/10 to-white rounded-3xl p-10 shadow-xl border border-[#FDB241]/30">
            <div className="bg-[#FDB241] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <Target className="w-8 h-8 text-[#1A1A1A]" />
            </div>
            <h3 className="text-3xl font-bold text-[#1A1A1A] mb-4">Our Mission</h3>
            <p className="text-[#4A4A4A] text-lg leading-relaxed mb-6">
              To create an inclusive e-commerce ecosystem where every business can thrive online and every customer can discover authentic, quality products that bring smiles and build connections.
            </p>
            <ul className="space-y-3 text-[#4A4A4A]">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#FDB241] rounded-full mt-2.5"></div>
                <span>Empowering local businesses and women entrepreneurs</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#FDB241] rounded-full mt-2.5"></div>
                <span>Promoting sustainable shopping and organic living</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#FDB241] rounded-full mt-2.5"></div>
                <span>Making online selling accessible to everyone</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#FDB241] rounded-full mt-2.5"></div>
                <span>Building a trusted community marketplace for India</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-[#FDB241]/10 to-white rounded-3xl p-10 shadow-xl border border-[#FDB241]/30">
            <div className="bg-[#FDB241] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <Globe className="w-8 h-8 text-[#1A1A1A]" />
            </div>
            <h3 className="text-3xl font-bold text-[#1A1A1A] mb-4">Our Vision</h3>
            <p className="text-[#4A4A4A] text-lg leading-relaxed">
              To become India's most trusted B2B and B2C marketplace — where businesses grow, customers smile, and communities thrive together.
            </p>
            <div className="mt-8 p-6 bg-white rounded-2xl border border-[#FDB241]/20">
              <div className="flex items-center gap-3">
                <Smile className="w-8 h-8 text-[#FDB241]" />
                <p className="text-[#1A1A1A] font-semibold">Net & Work Builds Up Net-Worth</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Join Community */}
      <div className="bg-gradient-to-r from-[#FDB241] to-[#FFD966] py-20 px-6">
        <div className="max-w-5xl mx-auto text-center text-[#1A1A1A]">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Join the Linknsmile Community</h2>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-[#FDB241]" />
              <h3 className="text-2xl font-bold mb-3">For Customers</h3>
              <p className="text-[#4A4A4A]">Start your conscious shopping journey today. Browse organic products, handmade items, and everyday essentials from sellers who care.</p>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
              <Store className="w-12 h-12 mx-auto mb-4 text-[#FDB241]" />
              <h3 className="text-2xl font-bold mb-3">For Sellers</h3>
              <p className="text-[#4A4A4A]">Ready to sell products online? Register as a seller and transform your business with our powerful e-commerce platform.</p>
            </div>
          </div>
          <p className="text-2xl font-semibold italic bg-white/30 backdrop-blur-sm inline-block px-8 py-4 rounded-full">
            Link your business. Share your smile. Shop with purpose.
          </p>
        </div>
      </div>

      {/* Contact & Social */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-6">Contact Us</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[#4A4A4A]">
                <Mail className="w-5 h-5 text-[#FDB241]" />
                <span>support@linknsmile.com</span>
              </div>
              <div className="flex items-center gap-3 text-[#4A4A4A]">
                <Phone className="w-5 h-5 text-[#FDB241]" />
                <span>xxxxxxxxxx</span>
              </div>
              <div className="flex items-center gap-3 text-[#4A4A4A]">
                <MapPin className="w-5 h-5 text-[#FDB241]" />
                <span>xxx,xcdfsrtgy,868ghjgdr,jiuygh</span>
              </div>
            </div>
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-[#1A1A1A] mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-[#FDB241]/20 rounded-full flex items-center justify-center hover:bg-[#FDB241] transition-colors group">
                  <Instagram className="w-5 h-5 text-[#FDB241] group-hover:text-white" />
                </a>
                <a href="#" className="w-10 h-10 bg-[#FDB241]/20 rounded-full flex items-center justify-center hover:bg-[#FDB241] transition-colors group">
                  <Facebook className="w-5 h-5 text-[#FDB241] group-hover:text-white" />
                </a>
                <a href="#" className="w-10 h-10 bg-[#FDB241]/20 rounded-full flex items-center justify-center hover:bg-[#FDB241] transition-colors group">
                  <Youtube className="w-5 h-5 text-[#FDB241] group-hover:text-white" />
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-6">Shop Categories</h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category, idx) => (
                <div key={idx} className="text-[#4A4A4A] hover:text-[#FDB241] cursor-pointer transition-colors bg-[#FDB241]/5 px-4 py-2 rounded-lg hover:bg-[#FDB241]/10">
                  {category}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-[#FDB241]/20 py-8 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-6 flex-wrap justify-center">
            <a href="#" className="text-[#1A1A1A] hover:text-[#FDB241] font-medium transition-colors">Start Shopping Today</a>
            <span className="text-[#FDB241]/30">|</span>
            <a href="#" className="text-[#1A1A1A] hover:text-[#FDB241] font-medium transition-colors">Register as Seller</a>
            <span className="text-[#FDB241]/30">|</span>
            <a href="#" className="text-[#1A1A1A] hover:text-[#FDB241] font-medium transition-colors">Download Our App</a>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-[#FDB241]" />
            <span className="text-sm text-[#4A4A4A]">Net & Work Builds Up Net-Worth</span>
          </div>
        </div>
      </div>
    </section>
  )
}