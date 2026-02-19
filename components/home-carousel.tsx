"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import carousel1 from "@/public/carousel1.jpg"
import carousel2 from "@/public/carousel2.jpg"
import carousel3 from "@/public/carousel3.jpg"

interface CarouselImage {
  _id: string
  url: string
  title?: string
  description?: string
}

interface HomeCarouselProps {
  images?: CarouselImage[]
}

const staticImages: CarouselImage[] = [
  { _id: "1", url: "/carousel1.jpg" },
  { _id: "2", url: "/carousel3.jpg" },
  { _id: "3", url: "/carousel2.png" },
  {_id:"4", url:"/carousel4.jpg"},
  {_id:"5", url:"/carousel5.jpg"},
  {_id:"6", url:"/carousel6.jpg"},
  {_id:"7", url:"/carousel7.jpg"}
]

export function HomeCarousel({ images }: HomeCarouselProps) {
  const carouselImages = images || staticImages
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const router = useRouter()

  // Handle auto play
  useEffect(() => {
    if (!autoPlay || carouselImages.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [autoPlay, carouselImages.length])

  if (!carouselImages || carouselImages.length === 0) return null

  const goToPrevious = () => {
    setAutoPlay(false)
    setCurrentIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)
  }

  const goToNext = () => {
    setAutoPlay(false)
    setCurrentIndex((prev) => (prev + 1) % carouselImages.length)
  }

  // Define click routes based on image index
  const handleImageClick = (index: number) => {
    if (index === 0) {
      router.push("/shop/instapeels")
    } else if (index === 1) {
      router.push("/shop/dermaflay")
    }
  }

  const currentImage = carouselImages[currentIndex]
  const isDataUrl = currentImage?.url?.startsWith("data:")

  return (
    <div
      className="relative w-full bg-gray-200 overflow-hidden mb-8 rounded-xl shadow-md"
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goToPrevious()
        if (e.key === "ArrowRight") goToNext()
      }}
      tabIndex={0}
      aria-roledescription="carousel"
    >
      {/* Maintain 1000x384 ratio (≈2.6:1) */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: "1000 / 384",
          minHeight: "180px",
        }}
      >
        {currentImage && (
          <div
            className="relative w-full h-full cursor-pointer"
            onClick={() => handleImageClick(currentIndex)}
          >
            {isDataUrl ? (
              <img
                src={currentImage.url}
                alt={currentImage.title || "Carousel image"}
                className="w-full h-full object-contain sm:object-cover object-center"
              />
            ) : (
              <Image
                src={currentImage.url}
                alt={currentImage.title || "Carousel image"}
                fill
                className="object-contain sm:object-cover object-center"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
                priority
                quality={90}
                unoptimized={currentImage.url.startsWith('/') || currentImage.url.startsWith('/public')}
              />
            )}

            {/* Optional overlay text */}
            {(currentImage.title || currentImage.description) && (
              <div className="absolute inset-0 bg-black/30 flex items-end pointer-events-none">
                <div className="w-full p-4 sm:p-6 text-white">
                  {currentImage.title && (
                    <h3 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">
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
        )}

        {/* Navigation buttons */}
        {carouselImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white z-20"
              onClick={goToPrevious}
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white z-20"
              onClick={goToNext}
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Dots */}
        {carouselImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {carouselImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAutoPlay(false)
                  setCurrentIndex(idx)
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
        )}
      </div>

      {/* Slide Counter */}
      {carouselImages.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs sm:text-sm z-20">
          {currentIndex + 1} / {carouselImages.length}
        </div>
      )}
    </div>
  )
}