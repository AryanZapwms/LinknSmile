"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  Package,
  Truck,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
} from "lucide-react";

const tabs = [
  { id: "ordering", label: "Ordering", icon: ShoppingBag },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "returns", label: "Returns", icon: RotateCcw },
];

export default function OrdersReturns() {
  const [activeTab, setActiveTab] = useState("ordering");

  return (
    <section className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-[#B18D0C] blur-3xl"></div>
          <div className="absolute right-10 bottom-20 h-96 w-96 rounded-full bg-[#B18D0C] blur-3xl"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-[#B18D0C]/20">
            <Package className="h-10 w-10 text-[#B18D0C]" />
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            Orders & <span className="text-[#B18D0C]">Returns</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-300 md:text-xl">
            Everything you need to know about ordering, shipping, and returning your Instapeel
            chemical peel products.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-6">
        <div className="flex flex-wrap justify-center gap-2 rounded-2xl bg-white p-2 shadow-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 rounded-xl px-6 py-4 font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-[#B18D0C] text-white shadow-lg"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Ordering Tab */}
        {activeTab === "ordering" && (
          <div className="space-y-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-neutral-900">How to Order</h2>
              <p className="mx-auto max-w-2xl text-lg text-neutral-600">
                Purchasing Instapeel's professional-grade chemical peels for home use is simple and
                secure
              </p>
            </div>

            <div className="mb-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-lg transition-all hover:shadow-xl">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B18D0C]/10">
                  <ShoppingBag className="h-8 w-8 text-[#B18D0C]" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-900">Browse Products</h3>
                <p className="text-neutral-600">
                  Select from our range of chemical peels designed for different skin concerns and
                  types
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-lg transition-all hover:shadow-xl">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B18D0C]/10">
                  <CheckCircle2 className="h-8 w-8 text-[#B18D0C]" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-900">Secure Checkout</h3>
                <p className="text-neutral-600">
                  Complete your purchase with encrypted payment processing for your security
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-lg transition-all hover:shadow-xl">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B18D0C]/10">
                  <Truck className="h-8 w-8 text-[#B18D0C]" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-900">Fast Delivery</h3>
                <p className="text-neutral-600">
                  Receive your order within 3-7 business days with tracking information
                </p>
              </div>
            </div>

            <div className="rounded-r-xl border-l-4 border-[#B18D0C] bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 p-6">
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-neutral-900">
                <AlertTriangle className="h-5 w-5 text-[#B18D0C]" />
                Order Verification
              </h4>
              <p className="text-neutral-700">
                All orders are subject to verification. We may contact you to confirm details before
                processing your chemical peel product order.
              </p>
            </div>
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === "shipping" && (
          <div className="space-y-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-neutral-900">Shipping Information</h2>
              <p className="mx-auto max-w-2xl text-lg text-neutral-600">
                We ship Instapeel products across India with care and speed
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-xl bg-[#B18D0C]/10 p-4">
                    <Clock className="h-8 w-8 text-[#B18D0C]" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900">Delivery Time</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-[#B18D0C]"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">Metro Cities</p>
                      <p className="text-neutral-600">3-5 business days</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-[#B18D0C]"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">Other Cities</p>
                      <p className="text-neutral-600">5-7 business days</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-[#B18D0C]"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">Remote Areas</p>
                      <p className="text-neutral-600">7-10 business days</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-xl bg-[#B18D0C]/10 p-4">
                    <Package className="h-8 w-8 text-[#B18D0C]" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900">Packaging</h3>
                </div>
                <p className="mb-4 text-neutral-700">
                  All chemical peel products are carefully packaged to ensure they arrive in perfect
                  condition:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-neutral-700">Secure, tamper-proof packaging</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-neutral-700">Temperature-controlled shipping</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-neutral-700">Discreet, professional packaging</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-neutral-700">Full product information included</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-900 p-8 text-white">
              <h4 className="mb-4 text-xl font-bold">Track Your Order</h4>
              <p className="mb-4 text-neutral-300">
                Once your order ships, you'll receive a tracking number via email. Monitor your
                shipment's progress in real-time.
              </p>
              <p className="text-sm text-neutral-400">
                Orders are processed within 24 hours on business days
              </p>
            </div>
          </div>
        )}

        {/* Returns Tab */}
        {activeTab === "returns" && (
          <div className="space-y-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-neutral-900">Return Policy</h2>
              <p className="mx-auto max-w-2xl text-lg text-neutral-600">
                We have a 3-day return policy for unopened products
              </p>
            </div>

            <div className="mb-12 rounded-2xl bg-gradient-to-r from-[#B18D0C] to-[#8A6A09] p-8 text-center text-white">
              <h3 className="mb-2 text-3xl font-bold">3-Day Return Window</h3>
              <p className="text-xl text-neutral-100">
                From the date you receive your chemical peel products
              </p>
            </div>

            <div className="mb-12 grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                  <h3 className="text-2xl font-bold text-neutral-900">Eligible for Return</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-neutral-700">Unopened, unused products</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-neutral-700">Original packaging intact</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-neutral-700">All tags still attached</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-neutral-700">Valid proof of purchase</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-4">
                  <AlertTriangle className="h-10 w-10 text-orange-600" />
                  <h3 className="text-2xl font-bold text-neutral-900">Not Eligible</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-orange-600"></div>
                    <span className="text-neutral-700">Opened or used products</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-orange-600"></div>
                    <span className="text-neutral-700">Sale or clearance items</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-orange-600"></div>
                    <span className="text-neutral-700">Gift cards</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-orange-600"></div>
                    <span className="text-neutral-700">Items past 3-day window</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
              <h3 className="mb-6 text-2xl font-bold text-neutral-900">Return Process</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                    1
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-neutral-900">Contact Us</h4>
                    <p className="text-neutral-700">
                      Email care@instapeels.com to start your return request
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                    2
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-neutral-900">Get Approval</h4>
                    <p className="text-neutral-700">
                      We'll review and send you a return shipping label
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                    3
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-neutral-900">Ship It Back</h4>
                    <p className="text-neutral-700">
                      Pack securely and ship using our provided label
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                    4
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-neutral-900">Get Refunded</h4>
                    <p className="text-neutral-700">
                      Receive refund to original payment method within 5-10 days
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-r-xl border-l-4 border-[#B18D0C] bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 p-6">
              <h4 className="mb-2 font-semibold text-neutral-900">
                Damaged or Defective Products?
              </h4>
              <p className="text-neutral-700">
                Please inspect your order upon reception. Contact us immediately if items are
                defective, damaged, or incorrect. We'll make it right promptly.
              </p>
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-16 rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg md:p-12">
          <div className="mb-8 text-center">
            <h3 className="mb-4 text-3xl font-bold text-neutral-900">Need Help?</h3>
            <p className="text-lg text-neutral-600">
              Our customer support team is here to assist with your orders and returns
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <a
              href="mailto:care@instapeels.com"
              className="flex items-center justify-center gap-3 rounded-xl bg-[#B18D0C] px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#8A6A09] hover:shadow-xl"
            >
              <Mail className="h-5 w-5" />
              Email Support
            </a>
            <a
              href="tel:+919819079079"
              className="flex items-center justify-center gap-3 rounded-xl bg-neutral-900 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-neutral-800 hover:shadow-xl"
            >
              <Phone className="h-5 w-5" />
              Call Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
