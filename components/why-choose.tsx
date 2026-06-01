// components/why-choose.tsx
"use client"

import React, { useState } from "react"
import Image, { StaticImageData } from "next/image"

import bestPrice from "./assets/bestprice.png"
import fastDelivery from "./assets/fastdelivery.png"
import quickOrder from "./assets/quickorders.png"
import rupayImage from "./assets/rupay.png"
import gpayImage from "./assets/gpay.png"
import phonePeImage from "./assets/phonepe.png"
import upiImage from "./assets/upi.png"
import mastercardImage from "./assets/mastercard.png"
import amexImage from "./assets/amex.png"
import onlineBankingImage from "./assets/onlinebanking.png"
import varifiedIcon from "./assets/verified-icon.png"

type FeatureProps = {
  title: string
  desc: string
  image: StaticImageData
  accent: string
}

function Feature({ title, desc, image, accent }: FeatureProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="group flex flex-col gap-4 bg-white rounded-2xl p-6 border border-stone-100 hover:border-amber-200 hover:shadow-md transition-all duration-200">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}
      >
        <div className={`opacity-0 transition-opacity duration-300 ${loaded ? "opacity-100" : ""}`}>
          <Image
            src={image}
            alt={title}
            width={28}
            height={28}
            className="object-contain"
            onLoadingComplete={() => setLoaded(true)}
          />
        </div>
        {!loaded && (
          <div className="w-6 h-6 rounded bg-white/60 animate-pulse" />
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-900 mb-1">{title}</h3>
        <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function PaymentLogo({ img, index }: { img: StaticImageData; index: number }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="flex items-center justify-center h-10 px-3 bg-stone-50 rounded-xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50 transition-all duration-150 cursor-pointer">
      {!loaded && <div className="w-8 h-4 rounded bg-stone-200 animate-pulse" />}
      <Image
        src={img}
        alt={`payment-${index}`}
        width={64}
        height={24}
        className={`object-contain max-h-5 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute"}`}
        onLoadingComplete={() => setLoaded(true)}
      />
    </div>
  )
}

const features: FeatureProps[] = [
  {
    image: quickOrder,
    title: "Quick Order",
    desc: "Multiple SKUs can be entered manually or imported directly into the Quick Order form.",
    accent: "bg-amber-50",
  },
  {
    image: fastDelivery,
    title: "Fast Delivery",
    desc: "Sellers offer buyers much faster delivery for quicker satisfaction.",
    accent: "bg-blue-50",
  },
  {
    image: bestPrice,
    title: "Best Price",
    desc: "Get the lowest prices — shop smart and save more on every purchase.",
    accent: "bg-green-50",
  },
]

const paymentLogos = [
  rupayImage, gpayImage, phonePeImage, upiImage,
  mastercardImage, amexImage, onlineBankingImage,
]

export default function WhyChoose() {
  return (
    <section className="py-2">
      {/* Section label */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-stone-100" />
        <span className="text-xs font-semibold text-stone-400 tracking-widest uppercase">Why Shop With Us</span>
        <div className="h-px flex-1 bg-stone-100" />
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {features.map((f) => (
          <Feature key={f.title} {...f} />
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment section */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <Image src={varifiedIcon} alt="verified" width={20} height={20} className="object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">100% Payment Protection</p>
              <p className="text-xs text-stone-500">Easy Return Policy</p>
            </div>
            <span className="ml-auto text-xs text-stone-400">We accept</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {paymentLogos.map((img, i) => (
              <PaymentLogo key={i} img={img} index={i} />
            ))}
          </div>
        </div>

        {/* Contact section */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 flex flex-col justify-center items-center text-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-1">Have Queries or Concerns?</h3>
            <p className="text-xs text-stone-500">Our team is here to help you</p>
          </div>
          <a
            href="tel:9819079079"
            className="inline-flex items-center gap-2 bg-white text-amber-700 font-semibold text-sm py-2 px-5 rounded-xl border border-amber-200 hover:bg-amber-50 hover:border-amber-300 transition-all duration-150 shadow-sm"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  )
}