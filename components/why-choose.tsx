// components/why-choose.tsx
"use client";

import React, { useState } from "react";
import Image, { StaticImageData } from "next/image";

import bestPrice from "./assets/bestprice.png";
import fastDelivery from "./assets/fastdelivery.png";
import quickOrder from "./assets/quickorders.png";
import rupayImage from "./assets/rupay.png";
import gpayImage from "./assets/gpay.png";
import phonePeImage from "./assets/phonepe.png";
import upiImage from "./assets/upi.png";
import mastercardImage from "./assets/mastercard.png";
import amexImage from "./assets/amex.png";
import onlineBankingImage from "./assets/onlinebanking.png";
import varifiedIcon from "./assets/verified-icon.png";

type FeatureProps = {
  title: string;
  desc: string;
  image: StaticImageData;
  accent: string;
};

function Feature({ title, desc, image, accent }: FeatureProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-stone-100 bg-white p-6 transition-all duration-200 hover:border-amber-200 hover:shadow-md">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
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
        {!loaded && <div className="h-6 w-6 animate-pulse rounded bg-white/60" />}
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-stone-900">{title}</h3>
        <p className="text-xs leading-relaxed text-stone-500">{desc}</p>
      </div>
    </div>
  );
}

function PaymentLogo({ img, index }: { img: StaticImageData; index: number }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-stone-100 bg-stone-50 px-3 transition-all duration-150 hover:border-amber-200 hover:bg-amber-50">
      {!loaded && <div className="h-4 w-8 animate-pulse rounded bg-stone-200" />}
      <Image
        src={img}
        alt={`payment-${index}`}
        width={64}
        height={24}
        className={`max-h-5 object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "absolute opacity-0"}`}
        onLoadingComplete={() => setLoaded(true)}
      />
    </div>
  );
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
];

const paymentLogos = [
  rupayImage,
  gpayImage,
  phonePeImage,
  upiImage,
  mastercardImage,
  amexImage,
  onlineBankingImage,
];

export default function WhyChoose() {
  return (
    <section className="py-2">
      {/* Section label */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-100" />
        <span className="text-xs font-semibold tracking-widest text-stone-400 uppercase">
          Why Shop With Us
        </span>
        <div className="h-px flex-1 bg-stone-100" />
      </div>

      {/* Feature cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <Feature key={f.title} {...f} />
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payment section */}
        <div className="rounded-2xl border border-stone-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50">
              <Image
                src={varifiedIcon}
                alt="verified"
                width={20}
                height={20}
                className="object-contain"
              />
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
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-5 w-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-stone-900">Have Queries or Concerns?</h3>
            <p className="text-xs text-stone-500">Our team is here to help you</p>
          </div>
          <a
            href="tel:9819079079"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-5 py-2 text-sm font-semibold text-amber-700 shadow-sm transition-all duration-150 hover:border-amber-300 hover:bg-amber-50"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
}
