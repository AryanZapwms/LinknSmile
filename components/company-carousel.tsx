"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CarouselImage {
  _id: string;
  url: string;
  title?: string;
  description?: string;
}

interface CompanyCarouselProps {
  images: CarouselImage[];
}

const DEFAULT_AUTO_ADVANCE_MS = 5000;
const IMAGE_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw";

export function CompanyCarousel({ images }: CompanyCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (!autoPlay || images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, DEFAULT_AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [autoPlay, images.length]);

  if (!images || images.length === 0) return null;

  const goToPrevious = () => {
    setAutoPlay(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setAutoPlay(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden mb-8 shadow-lg"
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goToPrevious();
        if (e.key === "ArrowRight") goToNext();
      }}
      tabIndex={0}
      aria-roledescription="carousel"
    >
      <div
        className="relative w-full bg-gray-200"
        style={{
          aspectRatio: "1000 / 384",
          maxHeight: "420px",
        }}
      >
        {currentImage && (
          <Image
            src={currentImage.url}
            alt={currentImage.title || "Carousel slide"}
            fill
            className="object-contain sm:object-cover"
            priority
            quality={90}
            sizes={IMAGE_SIZES}
            unoptimized={currentImage.url.startsWith('/') || currentImage.url.startsWith('/public')}
          />
        )}

        {/* Optional Overlay */}
        {(currentImage.title || currentImage.description) && (
          <div className="absolute inset-0 bg-black/30 flex items-end">
            <div className="w-full p-4 sm:p-6 text-white">
              {currentImage.title && (
                <h3 className="text-lg sm:text-2xl font-bold mb-2">
                  {currentImage.title}
                </h3>
              )}
              {currentImage.description && (
                <p className="text-sm sm:text-base text-white/90">
                  {currentImage.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/40 text-white"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/40 text-white"
            onClick={goToNext}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAutoPlay(false);
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`rounded-full transition-all ${
                  idx === currentIndex
                    ? "w-6 sm:w-8 h-2 bg-white"
                    : "w-2 h-2 bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}