"use client"

import React from "react"
import { Mail, Phone, MapPin, Clock, Heart, Shield, Truck } from "lucide-react"

export default function ContactUs() {
  return (
    <section className="bg-gradient-to-b from-amber-50/50 to-white min-h-screen font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FDB241] via-[#FDB241] to-[#FFD966] py-20 px-6">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-[#1A1A1A] mb-6 tracking-tight">
            Get In <span className="text-white">Touch</span>
          </h1>
          <p className="text-[#1A1A1A]/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
            We're here to help you connect with local sellers, discover authentic products, and grow your business on India's trusted marketplace.
          </p>
          <div className="mt-6 inline-block bg-white/30 backdrop-blur-sm px-6 py-2 rounded-full text-[#1A1A1A] font-semibold">
            Net & Work Builds Up Net-Worth
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Contact Information Cards */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#FDB241]/20">
              <div className="flex items-start gap-4">
                <div className="bg-[#FDB241]/20 p-4 rounded-xl">
                  <MapPin className="w-6 h-6 text-[#FDB241]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">Visit Our Office</h3>
                  <address className="not-italic text-[#4A4A4A] leading-relaxed">
                    Healthcare Medical Center, S-55,<br />
                    Whispering Palms Shopping Center,<br />
                    Akurli road, Lokhandwala Township,<br />
                    Kandivali (E), Mumbai - 400101
                  </address>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#FDB241]/20">
              <div className="flex items-start gap-4">
                <div className="bg-[#FDB241]/20 p-4 rounded-xl">
                  <Phone className="w-6 h-6 text-[#FDB241]" />
                </div>
                <div className="w-full">
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Call Us</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-[#4A4A4A] mb-1">Customer Support</p>
                      <a href="tel:+919819079079" className="text-lg text-[#1A1A1A] hover:text-[#FDB241] transition-colors font-medium">
                        +91 9819079079
                      </a>
                    </div>
                    <div className="pt-2">
                      <p className="text-sm text-[#4A4A4A] mb-1">Seller Support</p>
                      <a href="tel:+919321179079" className="text-lg text-[#1A1A1A] hover:text-[#FDB241] transition-colors font-medium">
                        +91 9321179079
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#FDB241]/20">
              <div className="flex items-start gap-4">
                <div className="bg-[#FDB241]/20 p-4 rounded-xl">
                  <Mail className="w-6 h-6 text-[#FDB241]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">Email Us</h3>
                  <div className="space-y-2">
                    <a href="mailto:support@linknsmile.com" className="text-lg text-[#1A1A1A] hover:text-[#FDB241] transition-colors font-medium block">
                      support@linknsmile.com
                    </a>
                    <a href="mailto:sellers@linknsmile.com" className="text-lg text-[#1A1A1A] hover:text-[#FDB241] transition-colors font-medium block">
                      sellers@linknsmile.com
                    </a>
                  </div>
                  <p className="text-sm text-[#4A4A4A] mt-2">
                    We'll respond within 24 hours
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#FDB241] to-[#FFD966] rounded-2xl p-8 shadow-lg text-[#1A1A1A]">
              <div className="flex items-start gap-4">
                <div className="bg-white/30 p-4 rounded-xl">
                  <Clock className="w-6 h-6 text-[#1A1A1A]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Business Hours</h3>
                  <div className="space-y-1 text-[#1A1A1A]/80">
                    <p>Monday - Saturday: 10:00 AM - 7:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Support Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-md border border-[#FDB241]/20 text-center">
                <Shield className="w-6 h-6 text-[#FDB241] mx-auto mb-2" />
                <h4 className="font-semibold text-[#1A1A1A] text-sm">Verified Sellers</h4>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-md border border-[#FDB241]/20 text-center">
                <Truck className="w-6 h-6 text-[#FDB241] mx-auto mb-2" />
                <h4 className="font-semibold text-[#1A1A1A] text-sm">Fast Delivery</h4>
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-[#FDB241]/20">
              <div className="p-6 bg-gradient-to-r from-[#FDB241] to-[#FFD966]">
                <h3 className="text-2xl font-semibold text-[#1A1A1A]">Find Us Here</h3>
                <p className="text-[#1A1A1A]/80 mt-2">Visit us for partnership opportunities and support</p>
              </div>
              <iframe
                loading="lazy"
                src="https://maps.google.com/maps?q=Healthcare%20Medical%20Center%2C%20S-95%2C%20whispering%20plains%2C%20shopping%20Corner%2C%20Mumbra%2C%20Kandiwali%20road%2C%20Kandivali%20%28E%29%2C%20Mumbai%20Maharashtra%20India%2C%20400101&t=m&z=16&output=embed&iwloc=near"
                title="Healthcare Medical Center Location"
                aria-label="Healthcare Medical Center, S-55, Whispering Palms Shopping Center, Akurli road, Lokhandwala Township, Kandivali (E), Mumbai, Maharashtra, 400101"
                className="w-full h-[450px] border-0"
                allowFullScreen
              ></iframe>
            </div>

            {/* CTA Section */}
            <div className="mt-8 bg-gradient-to-r from-[#FDB241]/10 to-[#FFD966]/10 rounded-2xl p-8 border border-[#FDB241]/30">
              <h4 className="text-xl font-semibold text-[#1A1A1A] mb-3">Need Assistance?</h4>
              <p className="text-[#4A4A4A] mb-6">
                Whether you're a shopper looking for authentic products or a seller wanting to grow your business, our team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="tel:+919819079079"
                  className="flex-1 text-center bg-[#FDB241] hover:bg-[#FFD966] text-[#1A1A1A] font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Call Support
                </a>
                <a
                  href="mailto:sellers@linknsmile.com"
                  className="flex-1 text-center bg-white border-2 border-[#FDB241] hover:bg-[#FDB241]/10 text-[#1A1A1A] font-semibold py-4 px-6 rounded-xl transition-all duration-300"
                >
                  Sell With Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* For Sellers Section */}
      <div className="bg-gradient-to-b from-[#FDB241]/10 to-white py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
              Start Selling on <span className="text-[#FDB241]">Linknsmile</span>
            </h2>
            <p className="text-[#4A4A4A] text-lg max-w-2xl mx-auto">
              Join thousands of local businesses, home-based entrepreneurs, and organic product sellers reaching customers across India.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg text-center border border-[#FDB241]/20">
              <div className="bg-[#FDB241]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#FDB241]">1</span>
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Register Free</h3>
              <p className="text-sm text-[#4A4A4A]">Create your seller account in minutes</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg text-center border border-[#FDB241]/20">
              <div className="bg-[#FDB241]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#FDB241]">2</span>
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">List Products</h3>
              <p className="text-sm text-[#4A4A4A]">Showcase your products to millions</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg text-center border border-[#FDB241]/20">
              <div className="bg-[#FDB241]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#FDB241]">3</span>
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Start Selling</h3>
              <p className="text-sm text-[#4A4A4A]">Grow your business nationwide</p>
            </div>
          </div>
          <div className="text-center mt-8">
            <a
              href="/register-as-seller"
              className="inline-block bg-[#FDB241] hover:bg-[#FFD966] text-[#1A1A1A] font-semibold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg"
            >
              Register as Seller
            </a>
          </div>
        </div>
      </div>

      {/* Brand Promise Section */}
      <div className="bg-gradient-to-r from-[#FDB241] to-[#FFD966] py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Heart className="w-12 h-12 text-[#1A1A1A] mx-auto mb-4" />
          <h3 className="text-3xl font-bold text-[#1A1A1A] mb-4">
            India's Trusted <span className="text-white">Community Marketplace</span>
          </h3>
          <p className="text-[#1A1A1A]/80 text-lg leading-relaxed">
            Linknsmile connects small businesses, local sellers, and conscious shoppers under one digital roof. 
            Every purchase supports Indian entrepreneurs and helps build thriving communities.
          </p>
          <div className="mt-6 text-[#1A1A1A] font-semibold">
            Net & Work Builds Up Net-Worth
          </div>
        </div>
      </div>

      {/* Footer Contact Row */}
      <div className="max-w-7xl mx-auto px-6 py-8 border-t border-[#FDB241]/20">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#4A4A4A]">
          <div className="flex gap-4">
            <a href="/about-us" className="hover:text-[#FDB241] transition-colors">About Us</a>
            <span>|</span>
            <a href="/privacy-policy" className="hover:text-[#FDB241] transition-colors">Privacy Policy</a>
            <span>|</span>
            <a href="/terms-of-service" className="hover:text-[#FDB241] transition-colors">Terms</a>
          </div>
          <p>© {new Date().getFullYear()} Linknsmile. All rights reserved.</p>
        </div>
      </div>
    </section>
  )
}