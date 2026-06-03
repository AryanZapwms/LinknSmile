// components/footer.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import LinkAndSmileLogo from "@/public/LinkAndSmile2.png";

const categories = [
  { href: "/categories/organic-products", label: "Organic Products" },
  { href: "/categories/handmade-items", label: "Handmade Items" },
  { href: "/categories/fashion-apparel", label: "Fashion & Apparel" },
  { href: "/categories/home-living", label: "Home & Living" },
];

const quickLinks = [
  { href: "/about-us", label: "About Us" },
  { href: "/contact-us", label: "Contact Us" },
  { href: "/register-as-seller", label: "Sell With Us" },
];

const policies = [
  { href: "/termsofservice", label: "Terms of Service" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/orders-and-returns", label: "Orders & Returns" },
];

const socials = [
  {
    href: "https://www.facebook.com/linknsmile/",
    label: "Facebook",
    icon: (
      <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692V11.07h3.128V8.414c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.794.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.764v2.315h3.587l-.467 3.636h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
    ),
  },
  {
    href: "https://www.instagram.com/linknsmileofficial/",
    label: "Instagram",
    icon: (
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8 2.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm-4 1.25a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    ),
  },
  {
    href: "https://www.youtube.com/@linknsmileofficial",
    label: "YouTube",
    icon: (
      <path d="M23.498 6.186a2.965 2.965 0 0 0-2.087-2.1C19.548 3.5 12 3.5 12 3.5s-7.548 0-9.411.586a2.965 2.965 0 0 0-2.087 2.1A31.42 31.42 0 0 0 0 12a31.42 31.42 0 0 0 .502 5.814 2.965 2.965 0 0 0 2.087 2.1C4.452 20.5 12 20.5 12 20.5s7.548 0 9.411-.586a2.965 2.965 0 0 0 2.087-2.1A31.42 31.42 0 0 0 24 12a31.42 31.42 0 0 0-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    ),
  },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-stone-500 transition-colors duration-150 hover:text-amber-600"
      >
        {label}
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-stone-100 bg-stone-50 text-stone-800">
      {/* Top accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-60" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main content */}
        <div className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-12 lg:gap-12 lg:py-14">
          {/* Brand */}
          <div className="space-y-5 lg:col-span-4">
            <Link href="/" className="group inline-flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-1 ring-amber-200 transition-all duration-200 group-hover:ring-amber-400">
                <Image
                  src={LinkAndSmileLogo}
                  alt="LinkAndSmile Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold tracking-tight text-stone-900">
                  linknsmile
                </span>
                <span className="mt-0.5 text-[10px] font-medium tracking-widest text-stone-400 uppercase">
                  Net & Work Builds Up Net-Worth
                </span>
              </div>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-stone-500">
              India's trusted online marketplace connecting small businesses, local sellers, and
              conscious shoppers under one digital roof.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-2">
              {socials.map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`LinkAndSmile ${label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white transition-all duration-150 hover:border-amber-300 hover:bg-amber-50"
                >
                  <svg
                    className="h-4 w-4 text-stone-500 hover:text-amber-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {icon}
                  </svg>
                </a>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {["Verified Sellers", "Made in India", "Secure Payments"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            <div>
              <h4 className="mb-4 text-xs font-bold tracking-widest text-stone-900 uppercase">
                Categories
              </h4>
              <ul className="space-y-2.5">
                {categories.map((c) => (
                  <FooterLink key={c.href} {...c} />
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-bold tracking-widest text-stone-900 uppercase">
                Company
              </h4>
              <ul className="space-y-2.5">
                {quickLinks.map((c) => (
                  <FooterLink key={c.href} {...c} />
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-bold tracking-widest text-stone-900 uppercase">
                Policies
              </h4>
              <ul className="space-y-2.5">
                {policies.map((c) => (
                  <FooterLink key={c.href} {...c} />
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-bold tracking-widest text-stone-900 uppercase">
                Get in Touch
              </h4>
              <div className="space-y-3">
                <a
                  href="mailto:support@linknsmile.com"
                  className="flex items-start gap-2 text-sm text-stone-500 transition-colors duration-150 hover:text-amber-600"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  support@linknsmile.com
                </a>

                <div className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <div className="space-y-1">
                    <a
                      href="tel:+919321179079"
                      className="block text-sm text-stone-500 transition-colors duration-150 hover:text-amber-600"
                    >
                      +91 9321179079
                    </a>
                    <a
                      href="tel:+919819079079"
                      className="block text-sm text-stone-500 transition-colors duration-150 hover:text-amber-600"
                    >
                      +91 9819079079
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <address className="text-sm leading-relaxed text-stone-500 not-italic">
                    S-55, Whispering Palms,
                    <br />
                    Kandivali (E), Mumbai — 400101
                  </address>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-stone-100 py-5 sm:flex-row">
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} Linknsmile. All rights reserved.
          </p>
          <p className="text-xs text-stone-400">Crafted with ❤️ in Mumbai, India</p>
        </div>
      </div>
    </footer>
  );
}
