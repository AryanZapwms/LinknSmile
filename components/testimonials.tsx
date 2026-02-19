"use client"

import * as React from "react"
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react"
import { VariantProps, cva } from "class-variance-authority"
import {
  HTMLMotionProps,
  MotionValue,
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "motion/react"

// Utility function for className merging
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

// Card variants for light/dark themes
const cardVariants = cva("absolute will-change-transform", {
  variants: {
    variant: {
      dark: "flex size-full flex-col items-center justify-center gap-6 rounded-2xl border border-stone-700/50 bg-accent-foreground/80 p-6 backdrop-blur-md",
      light:
        "flex size-full flex-col items-center justify-center gap-6 rounded-2xl border bg-white/90 p-6 backdrop-blur-md shadow-lg",
    },
  },
  defaultVariants: {
    variant: "light",
  },
})



// Types
type Testimonial = {
  name: string
  quote: string
  image?: string
  profession?: string
  rating?: number
}

type TestimonialsProps = {
  companySlug?: string
  items?: Testimonial[]
  variant?: "light" | "dark"
  useScrollAnimation?: boolean
}

interface CardStickyProps
  extends HTMLMotionProps<"div">,
    VariantProps<typeof cardVariants> {
  arrayLength: number
  index: number
  incrementY?: number
  incrementZ?: number
  incrementRotation?: number
}

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>
}

// Default testimonials by company
const testimonialsByCompany: Record<string, Testimonial[]> = {
  instapeels: [
    {
      name: 'Priya Mehta',
      profession: 'Mumbai',
      rating: 5,
      quote:
        'Instapeel Alpha is a game-changer! My dull skin started glowing within a week. The texture feels smoother and my pigmentation marks have visibly lightened.',
    },
    {
      name: 'Rahul Sinha',
      profession: 'Pune',
      rating: 5,
      quote:
        'I was nervous about trying a peel, but Instapeel Alpha was super gentle. No irritation, just clear, even-toned skin. Totally worth it!',
    },
    {
      name: 'Karan Patel',
      profession: 'Ahmedabad',
      rating: 4.5,
      quote:
        'The M-Beta peel has worked wonders for my oily and acne-prone skin. It cleans out pores and reduces bumps without drying out.',
    },
  ],
  dermaflay: [
    {
      name: 'Ritika Shah',
      profession: 'Mumbai',
      rating: 5,
      quote:
        'Dermaflay Blue Moisturizer is pure magic! It keeps my skin hydrated all day without feeling greasy. My dull, tired skin now looks soft and radiant.',
    },
    {
      name: 'Amit Verma',
      profession: 'Delhi',
      rating: 5,
      quote:
        'This Pro-Ac moisturizer absorbs so fast! Its lightweight yet super nourishing. My skin feels calm and looks fresh even after a long day.',
    },
    {
      name: 'Neha Bansal',
      profession: 'Pune',
      rating: 4.5,
      quote:
        'I have tried dozens of moisturizers, but Dermaflay Evantone moisturizer stands out. It actually repairs and smoothens my skin texture.',
    },
  ],
  vibrissa: [
    {
      name: 'Rahul',
      profession: 'Beard Growth Enthusiast',
      rating: 5,
      quote:
        'The beard serum gave me thicker-looking growth and better coverage — highly recommended for men trying to fill patchy areas.',
    },
    {
      name: 'Siddharth',
      profession: 'Daily User',
      rating: 4.5,
      quote:
        'Easy to use and no irritation — integrates well into a daily grooming routine.',
    },
  ],
  default: [
    {
      name: 'Neha Kapoor',
      profession: 'Chandigarh',
      rating: 5,
      quote:
        'I bought the Complete Kit after seeing it on Instagram, and its the best decision ever. My skin looks cleaner, more even, and feels nourished.',
    },
    {
      name: 'Rohit Deshmukh',
      profession: 'Hyderabad',
      rating: 5,
      quote:
        'This max3surge moisturizer gives an instant glow and keeps my skin balanced. Its now a must-have in my morning routine',
    },
    {
      name: 'Simran Kaur',
      profession: 'Chandigarh',
      rating: 4.5,
      quote:
        'Dermaflay Pro-reverse moisturizer made my skin look healthy and plump again. I use it day and night!',
    },
  ],
}

// Context for scroll animation
const ContainerScrollContext = React.createContext<ContainerScrollContextValue | undefined>(undefined)

function useContainerScrollContext() {
  const context = React.useContext(ContainerScrollContext)
  if (context === undefined) {
    throw new Error("useContainerScrollContext must be used within a ContainerScrollContextProvider")
  }
  return context
}

// Review Stars Component
const ReviewStars = ({ rating, maxRating = 5, className }: { rating: number; maxRating?: number; className?: string }) => {
  const filledStars = Math.floor(rating)
  const fractionalPart = rating - filledStars
  const emptyStars = maxRating - filledStars - (fractionalPart > 0 ? 1 : 0)

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(filledStars)].map((_, index) => (
        <Star key={`filled-${index}`} className="w-4 h-4" fill="#FACC15" stroke="#FACC15" />
      ))}
      {fractionalPart > 0 && (
        <Star className="w-4 h-4" fill="#FACC15" stroke="#FACC15" opacity={0.5} />
      )}
      {[...Array(emptyStars)].map((_, index) => (
        <Star key={`empty-${index}`} className="w-4 h-4 text-gray-300" fill="currentColor" />
      ))}
    </div>
  )
}

// Container Scroll Component
const ContainerScroll: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, style, className, ...props }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start center", "end end"],
  })

  return (
    <ContainerScrollContext.Provider value={{ scrollYProgress }}>
      <div
        ref={scrollRef}
        className={cn("relative min-h-screen w-full", className)}
        style={{ perspective: "1000px", ...style }}
        {...props}
      >
        {children}
      </div>
    </ContainerScrollContext.Provider>
  )
}

// Cards Container Component
const CardsContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn("relative", className)}
      style={{ perspective: "1000px", ...props.style }}
      {...props}
    >
      {children}
    </div>
  )
}

// Card Transformed Component
const CardTransformed = React.forwardRef<HTMLDivElement, CardStickyProps>(
  (
    {
      arrayLength,
      index,
      incrementY = 10,
      incrementZ = 10,
      incrementRotation = -index + 90,
      className,
      variant,
      style,
      ...props
    },
    ref
  ) => {
    const { scrollYProgress } = useContainerScrollContext()

    const start = index / (arrayLength + 1)
    const end = (index + 1) / (arrayLength + 1)
    const range = React.useMemo(() => [start, end], [start, end])
    const rotateRange = [range[0] - 1.5, range[1] / 1.5]

    const y = useTransform(scrollYProgress, range, ["0%", "-180%"])
    const rotate = useTransform(scrollYProgress, rotateRange, [incrementRotation, 0])
    const transform = useMotionTemplate`translateZ(${index * incrementZ}px) translateY(${y}) rotate(${rotate}deg)`

    const dx = useTransform(scrollYProgress, rotateRange, [4, 0])
    const dy = useTransform(scrollYProgress, rotateRange, [4, 12])
    const blur = useTransform(scrollYProgress, rotateRange, [2, 24])
    const alpha = useTransform(scrollYProgress, rotateRange, [0.15, 0.2])
    const filter = variant === "light" 
      ? useMotionTemplate`drop-shadow(${dx}px ${dy}px ${blur}px rgba(0,0,0,${alpha}))`
      : "none"

    const cardStyle = {
      top: index * incrementY,
      transform,
      backfaceVisibility: "hidden" as const,
      zIndex: (arrayLength - index) * incrementZ,
      filter,
      ...style,
    }

    return (
      <motion.div
        layout="position"
        ref={ref}
        style={cardStyle}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      />
    )
  }
)
CardTransformed.displayName = "CardTransformed"

// Testimonial Card Component (for scroll animation)
const TestimonialCardScrollable = ({ testimonial, index, arrayLength, variant }: { 
  testimonial: Testimonial; 
  index: number; 
  arrayLength: number;
  variant: "light" | "dark";
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const displayText = isExpanded ? testimonial.quote : testimonial.quote.slice(0, 120) + (testimonial.quote.length > 120 ? "..." : "")

  return (
    <CardTransformed
      arrayLength={arrayLength}
      index={index + 2}
      variant={variant}
      role="article"
    >
      <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-[#C7A643] to-[#B79638] rounded-full flex items-center justify-center shadow-lg">
        <Quote className="w-5 h-5 text-white" fill="white" />
      </div>

      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C7A643] to-[#B79638] flex items-center justify-center text-white font-bold text-xl sm:w-16 sm:h-16 sm:text-2xl shadow-md">
          {testimonial.name.charAt(0)}
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{testimonial.name}</h3>
          {testimonial.profession && (
            <p className="text-sm text-gray-600">{testimonial.profession}</p>
          )}
        </div>

        <ReviewStars rating={testimonial.rating || 5} className="text-[#FACC15]" />

        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Verified User
        </span>

        <blockquote className="text-gray-700 leading-relaxed italic text-sm sm:text-base">
          {displayText}
          {testimonial.quote.length > 120 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 text-[#C7A643] font-medium hover:underline"
            >
              {isExpanded ? "Read less" : "Read more"}
            </button>
          )}
        </blockquote>
      </div>
    </CardTransformed>
  )
}

// Main Testimonials Component
export default function Testimonials({ companySlug, items, variant = "light", useScrollAnimation = true }: TestimonialsProps) {
  const testimonials: Testimonial[] = React.useMemo(() => {
    if (items && items.length > 0) return items
    if (companySlug) {
      const company = testimonialsByCompany[companySlug.toLowerCase()]
      if (company && company.length > 0) return company
    }
    return testimonialsByCompany.default
  }, [companySlug, items])

  const [currentIndex, setCurrentIndex] = React.useState<number>(0)

  if (!testimonials || testimonials.length === 0) return null

  // Scroll Animation View
  if (useScrollAnimation) {
    return (
      <section aria-labelledby="testimonials" className="py-12 px-4" style={{ backgroundColor: variant === "dark" ? "#1a1a1a" : "#FAF6E8" }}>
        <div className="max-w-7xl mx-auto">
          <h2 id="testimonials" className="text-center text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            What Our Customers Say
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Real experiences from real people who trust our products
          </p>

          <ContainerScroll className="container h-[300vh]">
          <div className="sticky inset-0 flex h-screen w-full items-center justify-center py-12">

          <CardsContainer className="relative mx-auto h-[320px] w-[240px] sm:h-[360px] sm:w-[280px] md:h-[380px] md:w-[320px] lg:h-[400px] lg:w-[360px]">
 
                {testimonials.map((testimonial, index) => (
                  <TestimonialCardScrollable
                    key={index}
                    testimonial={testimonial}
                    index={index}
                    arrayLength={testimonials.length}
                    variant={variant}
                  />
                ))}
              </CardsContainer>
            </div>
          </ContainerScroll>
        </div>
      </section>
    )
  }

  // Carousel View (original design)
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))
  }

  const currentTestimonial = testimonials[currentIndex]
  const [isExpanded, setIsExpanded] = React.useState(false)
  const displayText = isExpanded 
    ? currentTestimonial.quote 
    : currentTestimonial.quote.slice(0, 150) + (currentTestimonial.quote.length > 150 ? "..." : "")

  return (
    <section aria-labelledby="testimonials" className="py-12 px-4 border rounded-2xl" style={{ backgroundColor: '#FAF6E8' }}>
      <h2 id="testimonials" className="text-center text-2xl md:text-3xl font-semibold mb-10 text-gray-900">
        Our Customers
      </h2>

      <div className="relative max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrev}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-[#C7A643] text-white hover:bg-[#B79638] transition flex items-center justify-center shadow-md z-10"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="relative bg-white rounded-3xl shadow-2xl border-2 border-[#C7A643] p-8 md:p-10 max-w-2xl w-full">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#C7A643] to-[#B79638] rounded-full flex items-center justify-center shadow-lg">
              <Quote className="w-6 h-6 text-white" fill="white" />
            </div>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C7A643] to-[#B79638] flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-md">
                {currentTestimonial.name.charAt(0)}
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{currentTestimonial.name}</h3>
              {currentTestimonial.profession && (
                <p className="text-gray-600 mb-3">{currentTestimonial.profession}</p>
              )}

              <ReviewStars rating={currentTestimonial.rating || 5} />
              
              <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified User
              </span>
            </div>

            <blockquote className="text-gray-600 leading-relaxed italic text-base md:text-lg text-center">
              {displayText}
              {currentTestimonial.quote.length > 150 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="ml-2 text-[#C7A643] font-medium hover:underline"
                >
                  {isExpanded ? "Read less" : "Read more"}
                </button>
              )}
            </blockquote>
          </div>

          <button
            onClick={handleNext}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-[#C7A643] text-white hover:bg-[#B79638] transition flex items-center justify-center shadow-md z-10"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-[#C7A643] w-6' : 'bg-gray-400/30 hover:bg-gray-400/60'
              }`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}