// app/contact-us/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock, Shield, Truck, Store, ChevronRight } from "lucide-react";

const contactCards = [
  {
    icon: MapPin,
    title: "Visit Our Office",
    content: (
      <address className="text-sm leading-relaxed text-stone-600 not-italic">
        Healthcare Medical Center, S-55,
        <br />
        Whispering Palms Shopping Center,
        <br />
        Akurli road, Lokhandwala Township,
        <br />
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
          <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
            Customer Support
          </p>
          <a
            href="tel:+919819079079"
            className="text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
          >
            +91 9819079079
          </a>
        </div>
        <div>
          <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
            Seller Support
          </p>
          <a
            href="tel:+919321179079"
            className="text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
          >
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
        <a
          href="mailto:support@linknsmile.com"
          className="block text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
        >
          support@linknsmile.com
        </a>
        <a
          href="mailto:sellers@linknsmile.com"
          className="block text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
        >
          sellers@linknsmile.com
        </a>
        <p className="mt-1 text-xs text-stone-400">We respond within 24 hours</p>
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
];

const sellerSteps = [
  { step: "1", title: "Register Free", desc: "Create your seller account in minutes" },
  { step: "2", title: "List Products", desc: "Showcase your products to millions" },
  { step: "3", title: "Start Selling", desc: "Grow your business nationwide" },
];

export default function ContactUs() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────── */}
      <section className="relative overflow-hidden bg-stone-900 px-4 py-18 md:py-24">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="pointer-events-none absolute top-0 left-1/2 h-[250px] w-[500px] -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-3xl py-8 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-amber-300 uppercase">
            <Mail className="h-3.5 w-3.5" />
            We'd love to hear from you
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-white md:text-5xl">
            Get In <span className="text-amber-400">Touch</span>
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-300 md:text-base">
            We're here to help you connect with local sellers, discover authentic products, and grow
            your business on India's trusted marketplace.
          </p>
          <p className="mt-5 text-xs font-semibold tracking-widest text-amber-400/60 uppercase">
            Net &amp; Work Builds Up Net-Worth
          </p>
        </div>
      </section>

      {/* ── Main content ─────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {/* Contact cards */}
          <div className="space-y-4">
            {contactCards.map(({ icon: Icon, title, content }) => (
              <div
                key={title}
                className="rounded-2xl border border-stone-100 bg-white p-5 transition-all duration-200 hover:border-amber-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                    <Icon className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="mb-2 text-xs font-bold tracking-wider text-stone-400 uppercase">
                      {title}
                    </p>
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
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50 p-3.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                    <Icon className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs font-semibold text-stone-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map + CTA */}
          <div className="space-y-5 lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                  <MapPin className="h-3.5 w-3.5 text-amber-600" />
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
                className="h-[340px] w-full border-0"
                allowFullScreen
              />
            </div>

            {/* CTA card */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <h4 className="mb-1.5 text-base font-bold text-stone-900">Need Assistance?</h4>
              <p className="mb-5 text-sm leading-relaxed text-stone-500">
                Whether you're a shopper or a seller — our team is here to help you every step of
                the way.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:+919819079079"
                  className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-amber-500"
                >
                  <Phone className="h-4 w-4" />
                  Call Us
                </a>
                <a
                  href="mailto:sellers@linknsmile.com"
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-stone-200 py-3 text-sm font-bold text-stone-700 transition-all duration-200 hover:border-amber-400 hover:bg-amber-50"
                >
                  <Store className="h-4 w-4" />
                  Sell With Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seller onboarding ─────────────── */}
      <section className="border-y border-stone-100 bg-stone-50 px-4 py-14">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold tracking-widest text-amber-600 uppercase">
            Grow Your Business
          </p>
          <h2 className="mb-3 text-2xl font-bold text-stone-900 md:text-3xl">
            Start Selling on Linknsmile
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-500">
            Join thousands of local businesses, home-based entrepreneurs, and organic product
            sellers reaching customers across India.
          </p>
        </div>

        <div className="mx-auto mb-8 grid max-w-3xl grid-cols-3 gap-4">
          {sellerSteps.map(({ step, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl border border-stone-100 bg-white p-5 text-center"
            >
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-700">
                {step}
              </div>
              <p className="mb-1 text-sm font-bold text-stone-900">{title}</p>
              <p className="text-xs text-stone-400">{desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/register-as-seller"
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-7 py-3 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-amber-500"
          >
            Register as Seller
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer strip ─────────────────── */}
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row">
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <Link href="/about-us" className="transition-colors hover:text-amber-600">
            About Us
          </Link>
          <span>·</span>
          <Link href="/privacy-policy" className="transition-colors hover:text-amber-600">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/termsofservice" className="transition-colors hover:text-amber-600">
            Terms
          </Link>
        </div>
        <p className="text-xs text-stone-400">
          © {new Date().getFullYear()} Linknsmile. All rights reserved.
        </p>
      </div>
    </main>
  );
}
