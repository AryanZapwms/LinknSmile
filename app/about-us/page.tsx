// app/about-us/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Award,
  Shield,
  Heart,
  Users,
  ShoppingBag,
  Store,
  Leaf,
  Hand,
  Package,
  Truck,
  BadgeCheck,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Target,
  Smile,
  ChevronRight,
} from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Verified Sellers",
    desc: "Shop with confidence from authenticated businesses and genuine sellers.",
  },
  {
    icon: BadgeCheck,
    title: "Secure Payments",
    desc: "Safe online payments with multiple options — UPI, cards, net banking.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    desc: "Quick shipping across India with reliable logistics partners.",
  },
  {
    icon: Award,
    title: "Best Prices",
    desc: "Competitive pricing on discount products, deals, and wholesale rates.",
  },
  {
    icon: Heart,
    title: "Customer Support",
    desc: "Dedicated support for a seamless online shopping experience.",
  },
  {
    icon: Sparkles,
    title: "Quality Assurance",
    desc: "Curated selection of quality products and authentic goods.",
  },
];

const shopperFeatures = [
  {
    icon: Leaf,
    title: "Organic & Natural Products",
    desc: "Browse organic food, natural skincare, chemical-free products, and eco-friendly items from verified sellers.",
  },
  {
    icon: Hand,
    title: "Handmade & Home-Based",
    desc: "Unique handmade crafts, homemade food, artisan goods, and cottage industry products made with care.",
  },
  {
    icon: ShoppingBag,
    title: "Everyday Shopping",
    desc: "Thousands of general merchandise, household items, fashion, home decor — your complete shopping solution.",
  },
  {
    icon: Heart,
    title: "Supporting Local Businesses",
    desc: "Every purchase supports small businesses, local vendors, and startup entrepreneurs building their dreams.",
  },
];

const sellerBenefits = [
  {
    icon: Store,
    title: "Sell Online With Ease",
    desc: "Start your online business on our seller-friendly platform. List products and reach customers nationwide.",
  },
  {
    icon: Users,
    title: "B2B Marketplace",
    desc: "Connect with bulk buyers, wholesalers, and retailers looking for wholesale products and trade supplies.",
  },
  {
    icon: Package,
    title: "Free Seller Registration",
    desc: "Join thousands of sellers already growing their business on India's emerging multi-vendor marketplace.",
  },
];

const categories = [
  "Organic Products",
  "Handmade Items",
  "Fashion & Apparel",
  "Home & Living",
  "Beauty & Care",
  "Food & Beverages",
  "Electronics",
  "Kids & Baby",
  "Gifts & Crafts",
  "Business Supplies",
];

const socials = [
  { href: "https://www.instagram.com/linknsmileofficial/", icon: Instagram, label: "Instagram" },
  { href: "https://www.facebook.com/linknsmile/", icon: Facebook, label: "Facebook" },
  { href: "https://www.youtube.com/@linknsmileofficial", icon: Youtube, label: "YouTube" },
];

export default function AboutUs() {
  return (
    <main className="bg-white">
      {/* ── Hero ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-stone-900 px-4 py-20 md:py-28">
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* amber glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-amber-300 uppercase backdrop-blur-sm">
            <Store className="h-3.5 w-3.5" />
            Where Business Meets Community
          </div>
          <h1 className="mb-5 text-4xl leading-tight font-black tracking-tight text-white md:text-6xl">
            Welcome to <span className="text-amber-400">Linknsmile</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
            India's trusted online marketplace connecting small businesses, local sellers, and
            conscious shoppers under one digital roof.
          </p>
          <p className="mt-5 inline-block text-xs font-semibold tracking-widest text-amber-400/70 uppercase">
            Net &amp; Work Builds Up Net-Worth
          </p>
        </div>
      </section>

      {/* ── Who We Are ───────────────────────── */}
      <section className="relative z-10 mx-auto -mt-10 mb-16 max-w-4xl px-4">
        <div className="rounded-2xl border border-stone-100 bg-white p-8 shadow-lg md:p-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Who We Are</h2>
          </div>
          <p className="text-base leading-relaxed text-stone-600 md:text-lg">
            Linknsmile is a{" "}
            <span className="font-semibold text-stone-900">B2B and B2C e-commerce platform</span>{" "}
            designed to empower local businesses, home-based entrepreneurs, and organic product
            sellers to reach customers across India. We are more than just a shopping website — we
            are a community marketplace that celebrates handmade products, organic goods, and
            quality everyday essentials.
          </p>
          <p className="mt-4 text-sm text-stone-500 italic">
            Whether you're a business owner looking to sell online or a customer searching for
            authentic, homemade products — Linknsmile is your destination.
          </p>
        </div>
      </section>

      {/* ── What We Offer ────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold tracking-widest text-amber-600 uppercase">
            Our Platform
          </p>
          <h2 className="text-2xl font-bold text-stone-900 md:text-3xl">What We Offer</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* For shoppers */}
          <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
            <div className="flex items-center gap-2 border-b border-stone-100 px-6 py-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">For Shoppers</h3>
            </div>
            <div className="space-y-5 p-6">
              {shopperFeatures.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-stone-50">
                    <Icon className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-semibold text-stone-900">{title}</p>
                    <p className="text-xs leading-relaxed text-stone-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For sellers */}
          <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
            <div className="flex items-center gap-2 border-b border-stone-100 px-6 py-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                <Store className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">For Sellers</h3>
            </div>
            <div className="space-y-5 p-6">
              {sellerBenefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-stone-50">
                    <Icon className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-semibold text-stone-900">{title}</p>
                    <p className="text-xs leading-relaxed text-stone-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Seller CTA */}
            <div className="px-6 pb-6">
              <Link
                href="/register-as-seller"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-amber-500"
              >
                Start Selling Free
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────── */}
      <section className="border-y border-stone-100 bg-stone-50 px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold tracking-widest text-amber-600 uppercase">
              Our Promise
            </p>
            <h2 className="text-2xl font-bold text-stone-900 md:text-3xl">
              Why Choose Linknsmile?
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-stone-100 bg-white p-5 transition-all duration-200 hover:border-amber-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 transition-colors group-hover:bg-amber-100">
                  <Icon className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-stone-900">{title}</h3>
                <p className="text-xs leading-relaxed text-stone-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ─────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Mission */}
          <div className="rounded-2xl border border-stone-100 bg-white p-7">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <Target className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="mb-3 text-lg font-bold text-stone-900">Our Mission</h3>
            <p className="mb-5 text-sm leading-relaxed text-stone-600">
              To create an inclusive e-commerce ecosystem where every business can thrive online and
              every customer can discover authentic, quality products that build real connections.
            </p>
            <ul className="space-y-2.5">
              {[
                "Empowering local businesses and women entrepreneurs",
                "Promoting sustainable shopping and organic living",
                "Making online selling accessible to everyone",
                "Building a trusted community marketplace for India",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-xs text-stone-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Vision */}
          <div className="rounded-2xl border border-stone-100 bg-white p-7">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <Globe className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="mb-3 text-lg font-bold text-stone-900">Our Vision</h3>
            <p className="mb-5 text-sm leading-relaxed text-stone-600">
              To become India's most trusted B2B and B2C marketplace — where businesses grow,
              customers smile, and communities thrive together.
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <Smile className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm font-semibold text-stone-800">
                Net &amp; Work Builds Up Net-Worth
              </p>
            </div>

            {/* Seller steps */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {["Register Free", "List Products", "Start Selling"].map((step, i) => (
                <div
                  key={step}
                  className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-center"
                >
                  <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-700">
                    {i + 1}
                  </div>
                  <p className="text-[10px] font-semibold text-stone-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Join Community ───────────────────── */}
      <section className="relative overflow-hidden bg-stone-900 px-4 py-16">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="pointer-events-none absolute top-0 left-1/2 h-[200px] w-[500px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative z-10 mx-auto mb-10 max-w-4xl text-center">
          <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">
            Join the Linknsmile Community
          </h2>
          <p className="text-sm text-stone-400">
            Link your business. Share your smile. Shop with purpose.
          </p>
        </div>
        <div className="relative z-10 mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition-colors hover:bg-white/10">
            <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-amber-400" />
            <h3 className="mb-2 text-base font-bold text-white">For Customers</h3>
            <p className="mb-5 text-xs leading-relaxed text-stone-400">
              Start your conscious shopping journey. Browse organic products, handmade items, and
              essentials from sellers who care.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
            >
              Start Shopping <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition-colors hover:bg-white/10">
            <Store className="mx-auto mb-3 h-8 w-8 text-amber-400" />
            <h3 className="mb-2 text-base font-bold text-white">For Sellers</h3>
            <p className="mb-5 text-xs leading-relaxed text-stone-400">
              Ready to sell? Register as a seller and transform your business with our powerful
              e-commerce platform.
            </p>
            <Link
              href="/register-as-seller"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
            >
              Become a Seller <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact + Categories ─────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact */}
          <div>
            <p className="mb-4 text-xs font-semibold tracking-widest text-amber-600 uppercase">
              Reach Us
            </p>
            <h3 className="mb-5 text-lg font-bold text-stone-900">Contact Us</h3>
            <div className="space-y-3">
              {[
                {
                  icon: Mail,
                  label: "support@linknsmile.com",
                  href: "mailto:support@linknsmile.com",
                },
                { icon: Phone, label: "+91 9819079079", href: "tel:+919819079079" },
                { icon: Phone, label: "+91 9321179079", href: "tel:+919321179079" },
                {
                  icon: MapPin,
                  label: "S-55, Whispering Palms, Kandivali (E), Mumbai — 400101",
                  href: undefined,
                },
              ].map(({ icon: Icon, label, href }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                    <Icon className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm font-medium text-stone-700 transition-colors hover:text-amber-600"
                    >
                      {label}
                    </a>
                  ) : (
                    <p className="text-sm text-stone-600">{label}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition-colors hover:bg-amber-100 hover:text-amber-600"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <p className="mb-4 text-xs font-semibold tracking-widest text-amber-600 uppercase">
              Explore
            </p>
            <h3 className="mb-5 text-lg font-bold text-stone-900">Shop Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href="/products"
                  className="flex items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-2.5 text-sm font-medium text-stone-600 transition-all duration-150 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
