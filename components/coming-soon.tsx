"use client"

import { Star } from "lucide-react"

interface ComingSoonProps {
  companyName?: string
}

export function ComingSoon({ companyName }: ComingSoonProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFBF3] to-[#FAF6E8] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8 mt-5">
        {/* Stars decoration */}
        <div className="flex justify-center gap-8 mb-8">
          <Star className="w-6 h-6 text-[#B08A2E] fill-[#B08A2E] animate-pulse" />
          <Star className="w-8 h-8 text-[#C29A43] fill-[#C29A43] animate-pulse delay-100" />
          <Star className="w-6 h-6 text-[#B08A2E] fill-[#B08A2E] animate-pulse delay-200" />
        </div>

        {/* Main Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#2D2415] tracking-wide">
            Coming Soon
          </h1>
          <p className="text-lg md:text-xl text-[#6B5B47] font-medium">
            {companyName ? `${companyName} is` : "We are"} preparing something special for you
          </p>
        </div>

        {/* Description */}
        <div className="bg-white/60 backdrop-blur-sm border-2 border-[#E8D5C4] rounded-2xl p-6 md:p-8 space-y-3">
          <p className="text-[#6B5B47] text-base md:text-lg leading-relaxed">
            ✨ Our team is working hard to bring you an amazing collection of premium beauty and skincare products.
          </p>
          <p className="text-[#8B7355] text-sm md:text-base">
            Stay tuned for exclusive launches, special offers, and products curated just for you.
          </p>
        </div>

        {/* Stay Tuned Section */}
        <div className="space-y-4">
          <div className="inline-block">
            <div className="bg-gradient-to-r from-[#B08A2E] to-[#C29A43] text-white px-8 py-4 rounded-full font-semibold text-lg tracking-wide shadow-lg">
              🌟 Stay Tuned 🌟
            </div>
          </div>
          
        </div>

       
        {/* Bottom decoration */}
        <div className="pt-8 flex justify-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-[#B08A2E]" />
          <div className="w-2 h-2 rounded-full bg-[#C29A43]" />
          <div className="w-2 h-2 rounded-full bg-[#A08C6A]" />
          <div className="w-2 h-2 rounded-full bg-[#C29A43]" />
          <div className="w-2 h-2 rounded-full bg-[#B08A2E]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
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
  )
}