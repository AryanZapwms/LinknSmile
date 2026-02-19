"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import LinkAndSmileLogo from "@/public/LinkAndSmile2.png";

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-amber-50 to-white text-[#1A1A1A]">
      {/* Decorative top border with gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FDB241] to-transparent opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Brand Section - Takes more space */}
            <div className="lg:col-span-4 space-y-6">
              <Link href="/" className="inline-block group" prefetch={true}>
                <div className="flex items-center gap-3 transition-transform duration-300 group-hover:scale-105">
                  <Image 
                    src={LinkAndSmileLogo} 
                    alt="Linknsmile Logo" 
                    width={80} 
                    height={80} 
                    className="object-contain rounded-xl shadow-lg ring-2 ring-[#FDB241]/30"
                    priority
                  />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
                      linknsmile
                    </span>
                    <span className="text-xs text-[#4A4A4A] tracking-wider">
                      Net & Work Builds Up Net-Worth
                    </span>
                  </div>
                </div>
              </Link>
              
              <p className="text-sm text-[#4A4A4A] leading-relaxed max-w-md">
                India's trusted online marketplace connecting small businesses, local sellers, and conscious shoppers under one digital roof.
              </p>

              {/* Social Media Icons */}
              <div className="flex gap-4">
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/linknsmile/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Linknsmile Facebook"
                  className="w-10 h-10 rounded-full bg-[#FDB241]/20 flex items-center justify-center hover:bg-[#FDB241] transition-colors duration-300 group"
                >
                  <svg
                    className="w-5 h-5 text-[#FDB241] group-hover:text-white transition-colors"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692V11.07h3.128V8.414c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.794.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.764v2.315h3.587l-.467 3.636h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/linknsmileofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Linknsmile Instagram"
                  className="w-10 h-10 rounded-full bg-[#FDB241]/20 flex items-center justify-center hover:bg-[#FDB241] transition-colors duration-300 group"
                >
                  <svg
                    className="w-5 h-5 text-[#FDB241] group-hover:text-white transition-colors"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8 2.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm-4 1.25a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@linknsmileofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Linknsmile YouTube"
                  className="w-10 h-10 rounded-full bg-[#FDB241]/20 flex items-center justify-center hover:bg-[#FDB241] transition-colors duration-300 group"
                >
                  <svg
                    className="w-5 h-5 text-[#FDB241] group-hover:text-white transition-colors"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M23.498 6.186a2.965 2.965 0 0 0-2.087-2.1C19.548 3.5 12 3.5 12 3.5s-7.548 0-9.411.586a2.965 2.965 0 0 0-2.087 2.1A31.42 31.42 0 0 0 0 12a31.42 31.42 0 0 0 .502 5.814 2.965 2.965 0 0 0 2.087 2.1C4.452 20.5 12 20.5 12 20.5s7.548 0 9.411-.586a2.965 2.965 0 0 0 2.087-2.1A31.42 31.42 0 0 0 24 12a31.42 31.42 0 0 0-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Navigation Links - Organized in 3 columns */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                
                {/* Categories */}
                <div>
                  <h4 className="text-sm font-bold text-[#FDB241] mb-4 tracking-wide uppercase">
                    Categories
                  </h4>
                  <ul className="space-y-3">
                    <li>
                      <Link href="/categories/organic-products" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        🌿 Organic Products
                      </Link>
                    </li>
                    <li>
                      <Link href="/categories/handmade-items" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        🏠 Handmade Items
                      </Link>
                    </li>
                    <li>
                      <Link href="/categories/fashion-apparel" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        👗 Fashion & Apparel
                      </Link>
                    </li>
                    <li>
                      <Link href="/categories/home-living" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        🏡 Home & Living
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Quick Links */}
                <div>
                  <h4 className="text-sm font-bold text-[#FDB241] mb-4 tracking-wide uppercase">
                    Quick Links
                  </h4>
                  <ul className="space-y-3">
                    <li>
                      <Link href="/about-us" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        About Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/blog" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        Blogs
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact-us" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        Contact Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/register-as-seller" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        Register as Seller
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Policies */}
                <div>
                  <h4 className="text-sm font-bold text-[#FDB241] mb-4 tracking-wide uppercase">
                    Policies
                  </h4>
                  <ul className="space-y-3">
                    <li>
                      <Link href="/termsofservice" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        Terms of Service
                      </Link>
                    </li>
                    <li>
                      <Link href="/refund-policy" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        Refund Policy
                      </Link>
                    </li>
                    <li>
                      <Link href="/privacy-policy" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link href="/orders-and-returns" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200 flex items-center group">
                        <span className="w-0 group-hover:w-2 h-px bg-[#FDB241] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                        Orders & Returns
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Contact */}
                <div>
                  <h4 className="text-sm font-bold text-[#FDB241] mb-4 tracking-wide uppercase">
                    Get in Touch
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-[#FDB241] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                      <a href="mailto:support@linknsmile.com" className="text-sm text-[#4A4A4A] hover:text-[#FDB241] transition-colors duration-200">
                        support@linknsmile.com
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-[#FDB241] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                      </svg>
                      <div className="text-sm text-[#4A4A4A] space-y-1">
                        <a href="tel:+919321179079" className="block hover:text-[#FDB241] transition-colors duration-200">
                          +91 9321179079
                        </a>
                        <a href="tel:+919819079079" className="block hover:text-[#FDB241] transition-colors duration-200">
                          +91 9819079079
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-[#FDB241] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      <address className="not-italic text-sm text-[#4A4A4A] leading-relaxed">
                        Healthcare Medical Center, S-55,<br/>
                        Whispering Palms Shopping Center,<br/> 
                        Akurli road, Lokhandwala Township,<br/>
                        Kandivali (E), Mumbai - 400101
                      </address>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Divider with gradient */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#FDB241]/30 to-transparent"></div>

        {/* Bottom Bar */}
        <div className="py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#4A4A4A]">
              © {new Date().getFullYear()} Linknsmile. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6 text-xs text-[#4A4A4A]">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#FDB241]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Verified Sellers
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#FDB241]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Made in India
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#FDB241]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Secure Payments
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}