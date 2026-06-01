// app/contact-us/page.tsx
"use client"

import React from "react"
import Link from "next/link"
import { Mail, Phone, MapPin, Clock, Shield, Truck, Store, ChevronRight } from "lucide-react"

const contactCards = [
  {
    icon: MapPin,
    title: "Visit Our Office",
    content: (
      <address className="not-italic text-sm text-stone-600 leading-relaxed">
        Healthcare Medical Center, S-55,<br />
        Whispering Palms Shopping Center,<br />
        Akurli road, Lokhandwala Township,<br />
        Kandivali (E), Mumbai — 400101
      </address>
    ),
  },
  {
    icon: Phone,
    title: "Call Us",
    content: (
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Customer Support</p>
          <a href="tel:+919819079079" className="text-sm font-semibold text-stone-800 hover:text-amber-600 transition-colors">
            +91 9819079079
          </a>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Seller Support</p>
          <a href="tel:+919321179079" className="text-sm font-semibold text-stone-800 hover:text-amber-600 transition-colors">
            +91 9321179079
          </a>
        </div>
      </div>
    ),
  },
  {
    icon: Mail,
    title: "Email Us",
    content: (
      <div className="space-y-2">
        <a href="mailto:support@linknsmile.com" className="block text-sm font-semibold text-stone-800 hover:text-amber-600 transition-colors">
          support@linknsmile.com
        </a>
        <a href="mailto:sellers@linknsmile.com" className="block text-sm font-semibold text-stone-800 hover:text-amber-600 transition-colors">
          sellers@linknsmile.com
        </a>
        <p className="text-xs text-stone-400 mt-1">We respond within 24 hours</p>
      </div>
    ),
  },
  {
    icon: Clock,
    title: "Business Hours",
    content: (
      <div className="space-y-1 text-sm text-stone-600">
        <div className="flex justify-between">
          <span>Monday – Saturday</span>
          <span className="font-semibold text-stone-800">10:00 AM – 7:00 PM</span>
        </div>
        <div className="flex justify-between">
          <span>Sunday</span>
          <span className="font-medium text-red-400">Closed</span>
        </div>
      </div>
    ),
  },
]

const sellerSteps = [
  { step: "1", title: "Register Free", desc: "Create your seller account in minutes" },
  { step: "2", title: "List Products", desc: "Showcase your products to millions" },
  { step: "3", title: "Start Selling", desc: "Grow your business nationwide" },
]

export default function ContactUs() {
  return (
    <main className="bg-white min-h-screen">

      {/* ── Hero ─────────────────────────── */}
      <section className="relative bg-stone-900 overflow-hidden py-18 md:py-24 px-4">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto text-center py-8">
          <div className="inline-flex items-center gap-2 bg-white/10 text-amber-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border border-white/10 mb-5">
            <Mail className="w-3.5 h-3.5" />
            We'd love to hear from you
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Get In <span className="text-amber-400">Touch</span>
          </h1>
          <p className="text-stone-300 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            We're here to help you connect with local sellers, discover authentic products, and grow your business on India's trusted marketplace.
          </p>
          <p className="mt-5 text-xs font-semibold tracking-widest uppercase text-amber-400/60">
            Net &amp; Work Builds Up Net-Worth
          </p>
        </div>
      </section>

      {/* ── Main content ─────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-8 items-start">

          {/* Contact cards */}
          <div className="space-y-4">
            {contactCards.map(({ icon: Icon, title, content }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-stone-100 hover:border-amber-200 hover:shadow-md transition-all duration-200 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">{title}</p>
                    {content}
                  </div>
                </div>
              </div>
            ))}

            {/* Trust pills */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, label: "Verified Sellers" },
                { icon: Truck, label: "Fast Delivery" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs font-semibold text-stone-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map + CTA */}
          <div className="lg:sticky lg:top-8 space-y-5">
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">Find Us Here</p>
                  <p className="text-xs text-stone-400">Visit us for partnerships and support</p>
                </div>
              </div>
              <iframe
                loading="lazy"
                src="https://maps.google.com/maps?q=Healthcare%20Medical%20Center%2C%20S-95%2C%20whispering%20plains%2C%20shopping%20Corner%2C%20Mumbra%2C%20Kandiwali%20road%2C%20Kandivali%20%28E%29%2C%20Mumbai%20Maharashtra%20India%2C%20400101&t=m&z=16&output=embed&iwloc=near"
                title="Linknsmile Office Location"
                aria-label="Office location map"
                className="w-full h-[340px] border-0"
                allowFullScreen
              />
            </div>

            {/* CTA card */}
            <div className="bg-stone-50 rounded-2xl border border-stone-100 p-6">
              <h4 className="text-base font-bold text-stone-900 mb-1.5">Need Assistance?</h4>
              <p className="text-sm text-stone-500 mb-5 leading-relaxed">
                Whether you're a shopper or a seller — our team is here to help you every step of the way.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:+919819079079"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-amber-500 transition-colors duration-200"
                >
                  <Phone className="w-4 h-4" />
                  Call Us
                </a>
                <a
                  href="mailto:sellers@linknsmile.com"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-stone-200 text-stone-700 text-sm font-bold hover:border-amber-400 hover:bg-amber-50 transition-all duration-200"
                >
                  <Store className="w-4 h-4" />
                  Sell With Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seller onboarding ─────────────── */}
      <section className="bg-stone-50 border-y border-stone-100 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">Grow Your Business</p>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-3">
            Start Selling on Linknsmile
          </h2>
          <p className="text-sm text-stone-500 max-w-xl mx-auto leading-relaxed">
            Join thousands of local businesses, home-based entrepreneurs, and organic product sellers reaching customers across India.
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 mb-8">
          {sellerSteps.map(({ step, title, desc }) => (
            <div key={step} className="bg-white rounded-2xl border border-stone-100 p-5 text-center">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 text-sm font-black flex items-center justify-center mx-auto mb-3">
                {step}
              </div>
              <p className="text-sm font-bold text-stone-900 mb-1">{title}</p>
              <p className="text-xs text-stone-400">{desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/register-as-seller"
            className="inline-flex items-center gap-2 bg-stone-900 text-white text-sm font-bold px-7 py-3 rounded-xl hover:bg-amber-500 transition-colors duration-200 shadow-sm"
          >
            Register as Seller
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer strip ─────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <Link href="/about-us" className="hover:text-amber-600 transition-colors">About Us</Link>
          <span>·</span>
          <Link href="/privacy-policy" className="hover:text-amber-600 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/termsofservice" className="hover:text-amber-600 transition-colors">Terms</Link>
        </div>
        <p className="text-xs text-stone-400">© {new Date().getFullYear()} Linknsmile. All rights reserved.</p>
      </div>

    </main>
  )
}