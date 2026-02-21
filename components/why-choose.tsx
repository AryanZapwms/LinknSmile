

"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image, { StaticImageData } from "next/image";

// Images
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

interface Company {
  _id: string;
  name: string;
  slug: string;
}

type FeatureProps = {
  title: string;
  desc: string;
  image: StaticImageData;
};

//  Skeleton Placeholder Component
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse ${className}`} />;
}

//  Feature card with loader
function Feature({ title, desc, image }: FeatureProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center h-full flex flex-col shadow-sm relative overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <Skeleton className="w-20 h-3 rounded" />
          <Skeleton className="w-24 h-3 rounded" />
        </div>
      )}

      <div className="flex justify-center mb-4">
        <div className="bg-purple-50 w-16 h-16 flex items-center justify-center rounded-full border border-purple-100">
          <Image
            src={image}
            alt={title}
            width={40}
            height={40}
            onLoadingComplete={() => setLoaded(true)}
            className={`object-contain transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}

// Logo with loader
function LogoWithLoader({ img, index }: { img: StaticImageData; index: number }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="flex items-center justify-center p-2 bg-white rounded-md border border-gray-100 h-14 relative overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      <Image
        src={img}
        alt={`payment-${index}`}
        width={80}
        height={32}
        className={`object-contain max-h-6 cursor-pointer hover:scale-105 ease-in-out duration-300 transition-transform ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoadingComplete={() => setLoaded(true)}
      />
    </div>
  );
}

export default function WhyChoose() {
  const displayName = "LinkAndSmile";

  const paymentLogos = [
    rupayImage,
    gpayImage,
    phonePeImage,
    upiImage,
    mastercardImage,
    amexImage,
    onlineBankingImage,
  ];

  return (
    <div className="py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-4 md:p-6">
          {/* Top features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Feature
              image={quickOrder}
              title="Quick Order"
              desc="Orders with multiple SKUs can be entered manually, or imported into the Quick Order form."
            />
            <Feature
              image={fastDelivery}
              title="Fast Delivery"
              desc="Extra fast delivery — sellers offer buyers much faster delivery for quicker satisfaction."
            />
            <Feature
              image={bestPrice}
              title="Best Price"
              desc="Get the lowest prices — shop smart and save more on every purchase."
            />
          </div>

          {/* Divider */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payments / left */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Image
                    src={varifiedIcon}
                    alt="verified"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                  <div>
                    <div className="text-sm font-semibold text-green-600">
                      100% Payment protection
                    </div>
                    <div className="text-xs text-gray-500">Easy Return Policy</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">{displayName} accepts</div>
              </div>

              {/* Logos grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-3 items-center">
                {paymentLogos.map((img, i) => (
                  <LogoWithLoader key={i} img={img} index={i} />
                ))}
              </div>
            </div>

            {/* Contact / right */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-center items-center text-center">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Have Queries or Concerns?
              </h3>

              <a
                href="tel:9819079079"
                className="bg-white hover:bg-blue-50 text-blue-600 font-semibold py-2 px-6 rounded-lg text-sm border-2 border-blue-100 shadow-sm transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
