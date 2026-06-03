// components/home-carousel.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselImage {
  _id: string;
  url: string;
  title?: string;
  description?: string;
}

interface HomeCarouselProps {
  images?: CarouselImage[];
}

const staticImages: CarouselImage[] = [
  { _id: "1", url: "/carousel1.jpg" },
  { _id: "2", url: "/carousel3.jpg" },
  { _id: "3", url: "/carousel2.png" },
  { _id: "4", url: "/carousel4.jpg" },
  { _id: "5", url: "/carousel5.jpg" },
  { _id: "6", url: "/carousel6.jpg" },
  { _id: "7", url: "/carousel7.jpg" },
];

export function HomeCarousel({ images }: HomeCarouselProps) {
  const carouselImages = images || staticImages;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex((index + carouselImages.length) % carouselImages.length);
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [carouselImages.length, isTransitioning]
  );

  useEffect(() => {
    if (!autoPlay || carouselImages.length === 0) return;
    const interval = setInterval(() => {
      goTo(currentIndex + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPlay, currentIndex, goTo, carouselImages.length]);

  if (!carouselImages || carouselImages.length === 0) return null;

  const handleImageClick = (index: number) => {
    if (index === 0) router.push("/shop/instapeels");
    else if (index === 1) router.push("/shop/dermaflay");
  };

  const currentImage = carouselImages[currentIndex];
  const isDataUrl = currentImage?.url?.startsWith("data:");

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-stone-100"
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goTo(currentIndex - 1);
        if (e.key === "ArrowRight") goTo(currentIndex + 1);
      }}
      tabIndex={0}
      aria-roledescription="carousel"
    >
      {/* Image container */}
      <div className="relative w-full" style={{ aspectRatio: "1000 / 384", minHeight: "180px" }}>
        {currentImage && (
          <div
            className={`relative h-full w-full cursor-pointer transition-opacity duration-400 ${
              isTransitioning ? "opacity-80" : "opacity-100"
            }`}
            onClick={() => handleImageClick(currentIndex)}
          >
            {isDataUrl ? (
              <img
                src={currentImage.url}
                alt={currentImage.title || "Carousel image"}
                className="h-full w-full object-contain object-center sm:object-cover"
              />
            ) : (
              <Image
                src={currentImage.url}
                alt={currentImage.title || "Carousel image"}
                fill
                className="object-contain object-center sm:object-cover"
                sizes="(max-width: 640px) 100vw, 100vw"
                priority
                quality={90}
                unoptimized={currentImage.url.startsWith("/")}
              />
            )}

            {(currentImage.title || currentImage.description) && (
              <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent">
                <div className="w-full p-5 text-white sm:p-8">
                  {currentImage.title && (
                    <h3 className="mb-1 text-lg font-bold sm:text-2xl">{currentImage.title}</h3>
                  )}
                  {currentImage.description && (
                    <p className="text-sm text-white/85 sm:text-base">{currentImage.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav buttons */}
        {carouselImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAutoPlay(false);
                goTo(currentIndex - 1);
              }}
              aria-label="Previous slide"
              className="absolute top-1/2 left-3 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm transition-all duration-150 hover:scale-105 hover:bg-white sm:left-5 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5 text-stone-700" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAutoPlay(false);
                goTo(currentIndex + 1);
              }}
              aria-label="Next slide"
              className="absolute top-1/2 right-3 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm transition-all duration-150 hover:scale-105 hover:bg-white sm:right-5 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5 text-stone-700" />
            </button>
          </>
        )}

        {/* Dots */}
        {carouselImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {carouselImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAutoPlay(false);
                  goTo(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "h-2 w-6 bg-white"
                    : "h-2 w-2 bg-white/50 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}

        {/* Slide counter */}
        {carouselImages.length > 1 && (
          <div className="absolute top-4 right-4 z-20 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {currentIndex + 1} / {carouselImages.length}
          </div>
        )}
      </div>
    </div>
  );
}
