"use client";

import React, { useState } from "react";
import { Shield, Eye, Lock, UserCheck, Cookie, Mail } from "lucide-react";

const privacySections = [
  {
    id: 1,
    title: "Information We Collect",
    icon: Eye,
    content: `When you visit Instapeels.com, we collect certain information about your device, your interaction with our site, and information necessary to process your purchases.

Device Information: We collect version of web browser, IP address, time zone, cookie information, what products you view, search terms, and how you interact with our site.

Order Information: We collect name, billing address, shipping address, payment information (including credit card numbers), email address, and phone number to fulfill your orders and provide you with our chemical peel products.

Customer Support Information: When you contact us for support regarding our products, we collect the information you provide to help resolve your queries.`,
  },
  {
    id: 2,
    title: "How We Use Your Information",
    icon: UserCheck,
    content: `We use your personal information to provide our services to you, which includes offering products for sale, processing payments, shipping and fulfillment of your order, and keeping you up to date on new products and services.

Purpose of Collection:
• To load the site accurately for you and perform analytics
• To provide products and services and fulfill our contract with you
• To process your payment information and arrange for shipping
• To communicate with you and provide customer support
• To screen orders for potential risk or fraud
• To provide you with information about our chemical peel products when aligned with your preferences`,
  },
  {
    id: 3,
    title: "Sharing Your Information",
    icon: Lock,
    content: `We share your personal information with service providers to help us provide our services and fulfill our contracts with you.

We use WooCommerce to power our online store. We may share your information to comply with applicable laws and regulations, to respond to lawful requests for information, or to protect our rights.

We do not sell your personal information. Your privacy and trust are paramount to Instapeel's commitment to providing safe, effective home-use chemical peel solutions.`,
  },
  {
    id: 4,
    title: "Cookies & Tracking",
    icon: Cookie,
    content: `A cookie is a small amount of information downloaded to your device when you visit our site. We use cookies to optimize your experience and provide our services.

We use functional, performance, and advertising cookies. Cookies make your browsing experience better by allowing the website to remember your actions and preferences.

Session cookies last until you stop browsing and persistent cookies last between 30 minutes and two years. You can control cookies through your browser settings, but removing cookies may negatively impact your user experience.

We use Google Analytics to understand how customers use our site. You can opt-out of Google Analytics at: https://tools.google.com/dlpage/gaoptout`,
  },
  {
    id: 5,
    title: "Data Retention & Security",
    icon: Shield,
    content: `When you place an order through our site, we will retain your personal information for our records unless and until you ask us to erase this information.

We take the security of your information seriously and implement appropriate measures to protect your personal data. Credit card information is always encrypted during transfer over networks.

However, no method of transmission over the internet is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.`,
  },
  {
    id: 6,
    title: "Your Rights & Choices",
    icon: UserCheck,
    content: `You have the right to:
• Access the personal information we hold about you
• Request correction of inaccurate information
• Request deletion of your information
• Object to processing of your information
• Withdraw consent at any time

To exercise these rights or if you have questions about our privacy practices, please contact us at care@instapeels.com

If you are not satisfied with our response, you have the right to lodge a complaint with the relevant data protection authority.`,
  },
];

export default function PrivacyPolicy() {
  const [activeTab, setActiveTab] = useState(1);

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
            <Shield className="h-10 w-10 text-[#B18D0C]" />
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            Privacy <span className="text-[#B18D0C]">Policy</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-300 md:text-xl">
            Your privacy is important to us. Learn how we collect, use, and protect your personal
            information when you shop for our premium chemical peel products.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        {/* Trust Badge */}
        <div className="mb-12 rounded-r-xl border-l-4 border-[#B18D0C] bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 p-6">
          <div className="flex items-start gap-4">
            <Lock className="mt-1 h-6 w-6 flex-shrink-0 text-[#B18D0C]" />
            <div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                Your Data is Protected
              </h3>
              <p className="leading-relaxed text-neutral-700">
                At Instapeel, we are committed to protecting your personal information with the
                highest standards of security and transparency. We only collect information
                necessary to provide you with exceptional service and our innovative home-use
                chemical peel products.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-12 overflow-x-auto">
          <div className="flex min-w-max gap-2 pb-4">
            {privacySections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-3 rounded-xl px-6 py-4 font-semibold whitespace-nowrap transition-all duration-300 ${
                    activeTab === section.id
                      ? "bg-[#B18D0C] text-white shadow-lg"
                      : "bg-white text-neutral-700 shadow-md hover:bg-neutral-50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Display */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-xl md:p-12">
          {privacySections.map((section) => {
            const Icon = section.icon;
            if (section.id === activeTab) {
              return (
                <div key={section.id} className="animate-fadeIn">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="rounded-xl bg-[#B18D0C]/10 p-4">
                      <Icon className="h-8 w-8 text-[#B18D0C]" />
                    </div>
                    <h2 className="text-3xl font-bold text-neutral-900">{section.title}</h2>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <p className="leading-relaxed whitespace-pre-line text-neutral-700">
                      {section.content}
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Contact Section */}
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-neutral-900 p-8 text-white">
            <Mail className="mb-4 h-12 w-12 text-[#B18D0C]" />
            <h3 className="mb-4 text-2xl font-bold">Have Privacy Questions?</h3>
            <p className="mb-6 text-neutral-300">
              Contact us for any privacy-related inquiries or to exercise your data rights.
            </p>
            <a
              href="mailto:care@instapeels.com"
              className="inline-block rounded-xl bg-[#B18D0C] px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-[#8A6A09]"
            >
              Email Us
            </a>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#B18D0C] to-[#8A6A09] p-8 text-white">
            <Shield className="mb-4 h-12 w-12 text-white" />
            <h3 className="mb-4 text-2xl font-bold">Data Protection</h3>
            <p className="mb-4 text-neutral-100">
              Healthcare Medical Center,
              <br />
              S-55, Whispering Palms Shopping Center,
              <br />
              Akurli road,Lokhandwala Township,
              <br />
              Kandivali (E), Mumbai, Maharashtra, 400101
            </p>
            <p className="text-sm text-neutral-200">Last Updated: 2025</p>
          </div>
        </div>
      </div>
    </section>
  );
}
