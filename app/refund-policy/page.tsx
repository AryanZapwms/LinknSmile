"use client";

import React from "react";
import { Package, RefreshCw, Shield, AlertCircle, CheckCircle, Mail } from "lucide-react";

const policySteps = [
  {
    step: 1,
    title: "3-Day Return Window",
    icon: Package,
    description:
      "You have 3 days after receiving your item to request a return. This ensures you have time to inspect our chemical peel products upon arrival.",
  },
  {
    step: 2,
    title: "Product Condition",
    icon: Shield,
    description:
      "Items must be in the same condition as received - unopened, unused, with tags, and in original packaging. You'll need the receipt or proof of purchase.",
  },
  {
    step: 3,
    title: "Return Request",
    icon: Mail,
    description:
      "Contact us at care@instapeels.com to initiate a return. We'll send you a return shipping label and instructions on where to send your package.",
  },
  {
    step: 4,
    title: "Refund Processing",
    icon: RefreshCw,
    description:
      "Once we receive and inspect your return, we'll notify you about refund approval. Approved refunds are processed to your original payment method.",
  },
];

const keyPoints = [
  {
    icon: CheckCircle,
    title: "Eligible Returns",
    items: [
      "Unopened and unused products",
      "Items with original packaging intact",
      "Products with tags still attached",
      "Valid proof of purchase provided",
    ],
  },
  {
    icon: AlertCircle,
    title: "Non-Returnable Items",
    items: [
      "Products on sale or clearance",
      "Gift cards and promotional items",
      "Opened chemical peel products (for safety)",
      "Items without return authorization",
    ],
  },
];

export default function RefundPolicy() {
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
            <RefreshCw className="h-10 w-10 text-[#B18D0C]" />
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            Refund & <span className="text-[#B18D0C]">Return Policy</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-300 md:text-xl">
            Your satisfaction is our priority. Review our straightforward return and refund process
            for Instapeel chemical peel products.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        {/* Policy Highlight */}
        <div className="mb-16 rounded-2xl bg-gradient-to-r from-[#B18D0C] to-[#8A6A09] p-8 text-center shadow-xl md:p-12">
          <h2 className="mb-4 text-4xl font-bold text-white">3-Day Return Policy</h2>
          <p className="mx-auto max-w-2xl text-xl text-neutral-100">
            We stand behind the quality of our home-use chemical peel products. If you're not
            completely satisfied, we're here to help.
          </p>
        </div>

        {/* Return Process Steps */}
        <div className="mb-20">
          <h3 className="mb-12 text-center text-3xl font-bold text-neutral-900">
            How Returns Work
          </h3>
          <div className="grid gap-8 md:grid-cols-2">
            {policySteps.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex-shrink-0 rounded-xl bg-[#B18D0C]/10 p-4">
                      <Icon className="h-8 w-8 text-[#B18D0C]" />
                    </div>
                    <div>
                      <div className="mb-2 inline-block rounded-full bg-[#B18D0C] px-3 py-1 text-sm font-bold text-white">
                        Step {item.step}
                      </div>
                      <h4 className="mb-2 text-xl font-semibold text-neutral-900">{item.title}</h4>
                    </div>
                  </div>
                  <p className="ml-20 leading-relaxed text-neutral-700">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Eligible vs Non-Eligible */}
        <div className="mb-16 grid gap-8 md:grid-cols-2">
          {keyPoints.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div
                    className={`rounded-xl p-4 ${
                      section.title === "Eligible Returns" ? "bg-green-100" : "bg-orange-100"
                    }`}
                  >
                    <Icon
                      className={`h-8 w-8 ${
                        section.title === "Eligible Returns" ? "text-green-600" : "text-orange-600"
                      }`}
                    />
                  </div>
                  <h4 className="text-2xl font-bold text-neutral-900">{section.title}</h4>
                </div>
                <ul className="space-y-3">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div
                        className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${
                          section.title === "Eligible Returns" ? "bg-green-600" : "bg-orange-600"
                        }`}
                      ></div>
                      <span className="text-neutral-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Additional Information */}
        <div className="mb-16 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 md:p-12">
          <h3 className="mb-6 text-2xl font-bold text-neutral-900">Important Information</h3>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                <Package className="h-5 w-5 text-[#B18D0C]" />
                Damages & Issues
              </h4>
              <p className="leading-relaxed text-neutral-700">
                Please inspect your order upon reception. Contact us immediately if the item is
                defective, damaged, or if you receive the wrong item, so we can evaluate the issue
                and make it right.
              </p>
            </div>
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                <RefreshCw className="h-5 w-5 text-[#B18D0C]" />
                Exchanges
              </h4>
              <p className="leading-relaxed text-neutral-700">
                The fastest way to ensure you get what you want is to return the item you have, and
                once the return is accepted, make a separate purchase for the new item.
              </p>
            </div>
          </div>
        </div>

        {/* Refund Timeline */}
        <div className="mb-16 rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg md:p-12">
          <h3 className="mb-6 text-center text-2xl font-bold text-neutral-900">
            Refund Processing Timeline
          </h3>
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                1
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900">We Receive Your Return</h4>
                <p className="text-neutral-600">Within 1-2 business days after you ship it</p>
              </div>
            </div>
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                2
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900">Inspection & Approval</h4>
                <p className="text-neutral-600">
                  We'll notify you via email within 1-2 business days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                3
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900">Refund Credited</h4>
                <p className="text-neutral-600">
                  Processed to your original payment method. Bank processing may take 5-10 business
                  days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-8 text-center md:p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[#B18D0C] blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <h3 className="mb-4 text-3xl font-bold text-white">Need Help with a Return?</h3>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-neutral-300">
              Our customer support team is ready to assist you with any questions about returns,
              refunds, or exchanges of our chemical peel products.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="mailto:care@instapeels.com"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B18D0C] px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#8A6A09] hover:shadow-xl"
              >
                <Mail className="h-5 w-5" />
                Email Support
              </a>
              <a
                href="tel:+919819079079"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-neutral-900 shadow-lg transition-all duration-300 hover:bg-neutral-100 hover:shadow-xl"
              >
                <Package className="h-5 w-5" />
                Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
