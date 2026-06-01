// app/about-us/page.tsx
"use client"

import React from "react"
import Link from "next/link"
import {
  Sparkles, Award, Shield, Heart, Users, ShoppingBag,
  Store, Leaf, Hand, Package, Truck, BadgeCheck,
  Phone, Mail, MapPin, Instagram, Facebook, Youtube,
  Globe, Target, Smile, ChevronRight,
} from "lucide-react"

const values = [
  { icon: Shield, title: "Verified Sellers", desc: "Shop with confidence from authenticated businesses and genuine sellers." },
  { icon: BadgeCheck, title: "Secure Payments", desc: "Safe online payments with multiple options — UPI, cards, net banking." },
  { icon: Truck, title: "Fast Delivery", desc: "Quick shipping across India with reliable logistics partners." },
  { icon: Award, title: "Best Prices", desc: "Competitive pricing on discount products, deals, and wholesale rates." },
  { icon: Heart, title: "Customer Support", desc: "Dedicated support for a seamless online shopping experience." },
  { icon: Sparkles, title: "Quality Assurance", desc: "Curated selection of quality products and authentic goods." },
]

const shopperFeatures = [
  { icon: Leaf, title: "Organic & Natural Products", desc: "Browse organic food, natural skincare, chemical-free products, and eco-friendly items from verified sellers." },
  { icon: Hand, title: "Handmade & Home-Based", desc: "Unique handmade crafts, homemade food, artisan goods, and cottage industry products made with care." },
  { icon: ShoppingBag, title: "Everyday Shopping", desc: "Thousands of general merchandise, household items, fashion, home decor — your complete shopping solution." },
  { icon: Heart, title: "Supporting Local Businesses", desc: "Every purchase supports small businesses, local vendors, and startup entrepreneurs building their dreams." },
]

const sellerBenefits = [
  { icon: Store, title: "Sell Online With Ease", desc: "Start your online business on our seller-friendly platform. List products and reach customers nationwide." },
  { icon: Users, title: "B2B Marketplace", desc: "Connect with bulk buyers, wholesalers, and retailers looking for wholesale products and trade supplies." },
  { icon: Package, title: "Free Seller Registration", desc: "Join thousands of sellers already growing their business on India's emerging multi-vendor marketplace." },
]

const categories = [
  "🌿 Organic Products", "🏠 Handmade Items", "👗 Fashion & Apparel",
  "🏡 Home & Living", "💄 Beauty & Care", "🍽️ Food & Beverages",
  "📱 Electronics", "👶 Kids & Baby", "🎁 Gifts & Crafts", "🛠️ Business Supplies",
]

const socials = [
  { href: "https://www.instagram.com/linknsmileofficial/", icon: Instagram, label: "Instagram" },
  { href: "https://www.facebook.com/linknsmile/", icon: Facebook, label: "Facebook" },
  { href: "https://www.youtube.com/@linknsmileofficial", icon: Youtube, label: "YouTube" },
]

export default function AboutUs() {
  return (
    <main className="bg-white">

      {/* ── Hero ─────────────────────────────── */}
      <section className="relative bg-stone-900 overflow-hidden py-20 md:py-28 px-4">
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        {/* amber glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-amber-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border border-white/10 mb-6">
            <Store className="w-3.5 h-3.5" />
            Where Business Meets Community
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-5 tracking-tight leading-tight">
            Welcome to{" "}
            <span className="text-amber-400">Linknsmile</span>
          </h1>
          <p className="text-stone-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            India's trusted online marketplace connecting small businesses, local sellers, and conscious shoppers under one digital roof.
          </p>
          <p className="mt-5 inline-block text-xs font-semibold tracking-widest uppercase text-amber-400/70">
            Net &amp; Work Builds Up Net-Worth
          </p>
        </div>
      </section>

      {/* ── Who We Are ───────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 -mt-10 relative z-10 mb-16">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-lg p-8 md:p-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Who We Are</h2>
          </div>
          <p className="text-stone-600 leading-relaxed text-base md:text-lg">
            Linknsmile is a <span className="font-semibold text-stone-900">B2B and B2C e-commerce platform</span> designed to empower local businesses, home-based entrepreneurs, and organic product sellers to reach customers across India. We are more than just a shopping website — we are a community marketplace that celebrates handmade products, organic goods, and quality everyday essentials.
          </p>
          <p className="text-stone-500 text-sm mt-4 italic">
            Whether you're a business owner looking to sell online or a customer searching for authentic, homemade products — Linknsmile is your destination.
          </p>
        </div>
      </section>

      {/* ── What We Offer ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">Our Platform</p>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900">What We Offer</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* For shoppers */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">For Shoppers</h3>
            </div>
            <div className="p-6 space-y-5">
              {shopperFeatures.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900 mb-0.5">{title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For sellers */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Store className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">For Sellers</h3>
            </div>
            <div className="p-6 space-y-5">
              {sellerBenefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900 mb-0.5">{title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Seller CTA */}
            <div className="px-6 pb-6">
              <Link
                href="/register-as-seller"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-amber-500 transition-colors duration-200"
              >
                Start Selling Free
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────── */}
      <section className="bg-stone-50 border-y border-stone-100 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">Our Promise</p>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900">Why Choose Linknsmile?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-stone-100 hover:border-amber-200 hover:shadow-md transition-all duration-200 p-5 group">
                <div className="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center mb-4 transition-colors">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-stone-900 mb-1">{title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ─────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Mission */}
          <div className="bg-white rounded-2xl border border-stone-100 p-7">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-5">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-3">Our Mission</h3>
            <p className="text-sm text-stone-600 leading-relaxed mb-5">
              To create an inclusive e-commerce ecosystem where every business can thrive online and every customer can discover authentic, quality products that build real connections.
            </p>
            <ul className="space-y-2.5">
              {[
                "Empowering local businesses and women entrepreneurs",
                "Promoting sustainable shopping and organic living",
                "Making online selling accessible to everyone",
                "Building a trusted community marketplace for India",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-xs text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Vision */}
          <div className="bg-white rounded-2xl border border-stone-100 p-7">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-5">
              <Globe className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-3">Our Vision</h3>
            <p className="text-sm text-stone-600 leading-relaxed mb-5">
              To become India's most trusted B2B and B2C marketplace — where businesses grow, customers smile, and communities thrive together.
            </p>
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <Smile className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm font-semibold text-stone-800">Net &amp; Work Builds Up Net-Worth</p>
            </div>

            {/* Seller steps */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {["Register Free", "List Products", "Start Selling"].map((step, i) => (
                <div key={step} className="text-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center mx-auto mb-2">{i + 1}</div>
                  <p className="text-[10px] font-semibold text-stone-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Join Community ───────────────────── */}
      <section className="bg-stone-900 py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Join the Linknsmile Community</h2>
          <p className="text-stone-400 text-sm">Link your business. Share your smile. Shop with purpose.</p>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors">
            <ShoppingBag className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">For Customers</h3>
            <p className="text-xs text-stone-400 leading-relaxed mb-5">Start your conscious shopping journey. Browse organic products, handmade items, and essentials from sellers who care.</p>
            <Link href="/products" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
              Start Shopping <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors">
            <Store className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">For Sellers</h3>
            <p className="text-xs text-stone-400 leading-relaxed mb-5">Ready to sell? Register as a seller and transform your business with our powerful e-commerce platform.</p>
            <Link href="/register-as-seller" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
              Become a Seller <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact + Categories ─────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-4">Reach Us</p>
            <h3 className="text-lg font-bold text-stone-900 mb-5">Contact Us</h3>
            <div className="space-y-3">
              {[
                { icon: Mail, label: "support@linknsmile.com", href: "mailto:support@linknsmile.com" },
                { icon: Phone, label: "+91 9819079079", href: "tel:+919819079079" },
                { icon: Phone, label: "+91 9321179079", href: "tel:+919321179079" },
                { icon: MapPin, label: "S-55, Whispering Palms, Kandivali (E), Mumbai — 400101", href: undefined },
              ].map(({ icon: Icon, label, href }) => (
                <div key={label} className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  {href ? (
                    <a href={href} className="text-sm text-stone-700 hover:text-amber-600 transition-colors font-medium">{label}</a>
                  ) : (
                    <p className="text-sm text-stone-600">{label}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-5">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-amber-100 hover:text-amber-600 transition-colors text-stone-500"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-4">Explore</p>
            <h3 className="text-lg font-bold text-stone-900 mb-5">Shop Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href="/products"
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-50 hover:bg-amber-50 border border-stone-100 hover:border-amber-200 rounded-xl text-sm text-stone-600 hover:text-amber-700 font-medium transition-all duration-150"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}