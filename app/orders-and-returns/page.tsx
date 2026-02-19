"use client"

import React, { useState } from "react"
import { ShoppingBag, Package, Truck, RotateCcw, AlertTriangle, CheckCircle2, Clock, Mail, Phone } from "lucide-react"

const tabs = [
  { id: 'ordering', label: 'Ordering', icon: ShoppingBag },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'returns', label: 'Returns', icon: RotateCcw }
]

export default function OrdersReturns() {
  const [activeTab, setActiveTab] = useState('ordering')

  return (
    <section className="bg-gradient-to-b from-neutral-50 to-white min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-20 px-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#B18D0C] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#B18D0C] rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#B18D0C]/20 rounded-2xl mb-6">
            <Package className="w-10 h-10 text-[#B18D0C]" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Orders & <span className="text-[#B18D0C]">Returns</span>
          </h1>
          <p className="text-neutral-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about ordering, shipping, and returning your Instapeel chemical peel products.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-2 flex gap-2 flex-wrap justify-center">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-[#B18D0C] text-white shadow-lg'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Ordering Tab */}
        {activeTab === 'ordering' && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">How to Order</h2>
              <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
                Purchasing Instapeel's professional-grade chemical peels for home use is simple and secure
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-neutral-100 text-center hover:shadow-xl transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#B18D0C]/10 rounded-2xl mb-4">
                  <ShoppingBag className="w-8 h-8 text-[#B18D0C]" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Browse Products</h3>
                <p className="text-neutral-600">
                  Select from our range of chemical peels designed for different skin concerns and types
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-neutral-100 text-center hover:shadow-xl transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#B18D0C]/10 rounded-2xl mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#B18D0C]" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Secure Checkout</h3>
                <p className="text-neutral-600">
                  Complete your purchase with encrypted payment processing for your security
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-neutral-100 text-center hover:shadow-xl transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#B18D0C]/10 rounded-2xl mb-4">
                  <Truck className="w-8 h-8 text-[#B18D0C]" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Fast Delivery</h3>
                <p className="text-neutral-600">
                  Receive your order within 3-7 business days with tracking information
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 border-l-4 border-[#B18D0C] rounded-r-xl p-6">
              <h4 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#B18D0C]" />
                Order Verification
              </h4>
              <p className="text-neutral-700">
                All orders are subject to verification. We may contact you to confirm details before processing your chemical peel product order.
              </p>
            </div>
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === 'shipping' && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">Shipping Information</h2>
              <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
                We ship Instapeel products across India with care and speed
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-neutral-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-[#B18D0C]/10 p-4 rounded-xl">
                    <Clock className="w-8 h-8 text-[#B18D0C]" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900">Delivery Time</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#B18D0C] rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">Metro Cities</p>
                      <p className="text-neutral-600">3-5 business days</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#B18D0C] rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">Other Cities</p>
                      <p className="text-neutral-600">5-7 business days</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#B18D0C] rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">Remote Areas</p>
                      <p className="text-neutral-600">7-10 business days</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-neutral-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-[#B18D0C]/10 p-4 rounded-xl">
                    <Package className="w-8 h-8 text-[#B18D0C]" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900">Packaging</h3>
                </div>
                <p className="text-neutral-700 mb-4">
                  All chemical peel products are carefully packaged to ensure they arrive in perfect condition:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700">Secure, tamper-proof packaging</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700">Temperature-controlled shipping</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700">Discreet, professional packaging</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700">Full product information included</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-neutral-900 rounded-2xl p-8 text-white">
              <h4 className="text-xl font-bold mb-4">Track Your Order</h4>
              <p className="text-neutral-300 mb-4">
                Once your order ships, you'll receive a tracking number via email. Monitor your shipment's progress in real-time.
              </p>
              <p className="text-sm text-neutral-400">
                Orders are processed within 24 hours on business days
              </p>
            </div>
          </div>
        )}

        {/* Returns Tab */}
        {activeTab === 'returns' && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">Return Policy</h2>
              <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
                We have a 3-day return policy for unopened products
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#B18D0C] to-[#8A6A09] rounded-2xl p-8 text-white text-center mb-12">
              <h3 className="text-3xl font-bold mb-2">3-Day Return Window</h3>
              <p className="text-xl text-neutral-100">
                From the date you receive your chemical peel products
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-neutral-100">
                <div className="flex items-center gap-4 mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                  <h3 className="text-2xl font-bold text-neutral-900">Eligible for Return</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <span className="text-neutral-700">Unopened, unused products</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <span className="text-neutral-700">Original packaging intact</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <span className="text-neutral-700">All tags still attached</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <span className="text-neutral-700">Valid proof of purchase</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-neutral-100">
                <div className="flex items-center gap-4 mb-6">
                  <AlertTriangle className="w-10 h-10 text-orange-600" />
                  <h3 className="text-2xl font-bold text-neutral-900">Not Eligible</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                    <span className="text-neutral-700">Opened or used products</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                    <span className="text-neutral-700">Sale or clearance items</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                    <span className="text-neutral-700">Gift cards</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                    <span className="text-neutral-700">Items past 3-day window</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200">
              <h3 className="text-2xl font-bold text-neutral-900 mb-6">Return Process</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-[#B18D0C] text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Contact Us</h4>
                    <p className="text-neutral-700">Email care@instapeels.com to start your return request</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-[#B18D0C] text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Get Approval</h4>
                    <p className="text-neutral-700">We'll review and send you a return shipping label</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-[#B18D0C] text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Ship It Back</h4>
                    <p className="text-neutral-700">Pack securely and ship using our provided label</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-[#B18D0C] text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">4</div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Get Refunded</h4>
                    <p className="text-neutral-700">Receive refund to original payment method within 5-10 days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 border-l-4 border-[#B18D0C] rounded-r-xl p-6">
              <h4 className="font-semibold text-neutral-900 mb-2">Damaged or Defective Products?</h4>
              <p className="text-neutral-700">
                Please inspect your order upon reception. Contact us immediately if items are defective, damaged, or incorrect. We'll make it right promptly.
              </p>
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-16 bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-neutral-100">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-neutral-900 mb-4">Need Help?</h3>
            <p className="text-neutral-600 text-lg">
              Our customer support team is here to assist with your orders and returns
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <a 
              href="mailto:care@instapeels.com"
              className="flex items-center justify-center gap-3 bg-[#B18D0C] hover:bg-[#8A6A09] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Mail className="w-5 h-5" />
              Email Support
            </a>
            <a 
              href="tel:+919819079079"
              className="flex items-center justify-center gap-3 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Phone className="w-5 h-5" />
              Call Us
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

