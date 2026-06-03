"use client";

import { Star } from "lucide-react";

interface ComingSoonProps {
  companyName?: string;
}

export function ComingSoon({ companyName }: ComingSoonProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFFBF3] to-[#FAF6E8] px-4">
      <div className="mt-5 w-full max-w-2xl space-y-8 text-center">
        {/* Stars decoration */}
        <div className="mb-8 flex justify-center gap-8">
          <Star className="h-6 w-6 animate-pulse fill-[#B08A2E] text-[#B08A2E]" />
          <Star className="h-8 w-8 animate-pulse fill-[#C29A43] text-[#C29A43] delay-100" />
          <Star className="h-6 w-6 animate-pulse fill-[#B08A2E] text-[#B08A2E] delay-200" />
        </div>

        {/* Main Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-wide text-[#2D2415] md:text-5xl lg:text-6xl">
            Coming Soon
          </h1>
          <p className="text-lg font-medium text-[#6B5B47] md:text-xl">
            {companyName ? `${companyName} is` : "We are"} preparing something special for you
          </p>
        </div>

        {/* Description */}
        <div className="space-y-3 rounded-2xl border-2 border-[#E8D5C4] bg-white/60 p-6 backdrop-blur-sm md:p-8">
          <p className="text-base leading-relaxed text-[#6B5B47] md:text-lg">
            ✨ Our team is working hard to bring you an amazing collection of premium beauty and
            skincare products.
          </p>
          <p className="text-sm text-[#8B7355] md:text-base">
            Stay tuned for exclusive launches, special offers, and products curated just for you.
          </p>
        </div>

        {/* Stay Tuned Section */}
        <div className="space-y-4">
          <div className="inline-block">
            <div className="rounded-full bg-gradient-to-r from-[#B08A2E] to-[#C29A43] px-8 py-4 text-lg font-semibold tracking-wide text-white shadow-lg">
              🌟 Stay Tuned 🌟
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="mb-5 flex justify-center gap-2 pt-8">
          <div className="h-2 w-2 rounded-full bg-[#B08A2E]" />
          <div className="h-2 w-2 rounded-full bg-[#C29A43]" />
          <div className="h-2 w-2 rounded-full bg-[#A08C6A]" />
          <div className="h-2 w-2 rounded-full bg-[#C29A43]" />
          <div className="h-2 w-2 rounded-full bg-[#B08A2E]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .delay-100 {
          animation-delay: 0.1s;
        }

        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}
