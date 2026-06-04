// components/testimonials.tsx
"use client";

import * as React from "react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { VariantProps, cva } from "class-variance-authority";
import {
  HTMLMotionProps,
  MotionValue,
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "framer-motion";

// Utility function for className merging
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(" ");
};

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
});

// Types
type Testimonial = {
  name: string;
  quote: string;
  image?: string;
  profession?: string;
  rating?: number;
};

type TestimonialsProps = {
  companySlug?: string;
  items?: Testimonial[];
  variant?: "light" | "dark";
  useScrollAnimation?: boolean;
};

interface CardStickyProps extends HTMLMotionProps<"div">, VariantProps<typeof cardVariants> {
  arrayLength: number;
  index: number;
  incrementY?: number;
  incrementZ?: number;
  incrementRotation?: number;
}

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>;
}

// Default testimonials by company
const testimonialsByCompany: Record<string, Testimonial[]> = {
  instapeels: [
    {
      name: "Priya Mehta",
      profession: "Mumbai",
      rating: 5,
      quote:
        "Instapeel Alpha is a game-changer! My dull skin started glowing within a week. The texture feels smoother and my pigmentation marks have visibly lightened.",
    },
    {
      name: "Rahul Sinha",
      profession: "Pune",
      rating: 5,
      quote:
        "I was nervous about trying a peel, but Instapeel Alpha was super gentle. No irritation, just clear, even-toned skin. Totally worth it!",
    },
    {
      name: "Karan Patel",
      profession: "Ahmedabad",
      rating: 4.5,
      quote:
        "The M-Beta peel has worked wonders for my oily and acne-prone skin. It cleans out pores and reduces bumps without drying out.",
    },
  ],
  dermaflay: [
    {
      name: "Ritika Shah",
      profession: "Mumbai",
      rating: 5,
      quote:
        "Dermaflay Blue Moisturizer is pure magic! It keeps my skin hydrated all day without feeling greasy. My dull, tired skin now looks soft and radiant.",
    },
    {
      name: "Amit Verma",
      profession: "Delhi",
      rating: 5,
      quote:
        "This Pro-Ac moisturizer absorbs so fast! Its lightweight yet super nourishing. My skin feels calm and looks fresh even after a long day.",
    },
    {
      name: "Neha Bansal",
      profession: "Pune",
      rating: 4.5,
      quote:
        "I have tried dozens of moisturizers, but Dermaflay Evantone moisturizer stands out. It actually repairs and smoothens my skin texture.",
    },
  ],
  vibrissa: [
    {
      name: "Rahul",
      profession: "Beard Growth Enthusiast",
      rating: 5,
      quote:
        "The beard serum gave me thicker-looking growth and better coverage — highly recommended for men trying to fill patchy areas.",
    },
    {
      name: "Siddharth",
      profession: "Daily User",
      rating: 4.5,
      quote: "Easy to use and no irritation — integrates well into a daily grooming routine.",
    },
  ],
  default: [
    {
      name: "Neha Kapoor",
      profession: "Chandigarh",
      rating: 5,
      quote:
        "I bought the Complete Kit after seeing it on Instagram, and its the best decision ever. My skin looks cleaner, more even, and feels nourished.",
    },
    {
      name: "Rohit Deshmukh",
      profession: "Hyderabad",
      rating: 5,
      quote:
        "This max3surge moisturizer gives an instant glow and keeps my skin balanced. Its now a must-have in my morning routine",
    },
    {
      name: "Simran Kaur",
      profession: "Chandigarh",
      rating: 4.5,
      quote:
        "Dermaflay Pro-reverse moisturizer made my skin look healthy and plump again. I use it day and night!",
    },
  ],
};

// Context for scroll animation
const ContainerScrollContext = React.createContext<ContainerScrollContextValue | undefined>(
  undefined
);

function useContainerScrollContext() {
  const context = React.useContext(ContainerScrollContext);
  if (context === undefined) {
    throw new Error(
      "useContainerScrollContext must be used within a ContainerScrollContextProvider"
    );
  }
  return context;
}

// Review Stars Component
const ReviewStars = ({
  rating,
  maxRating = 5,
  className,
}: {
  rating: number;
  maxRating?: number;
  className?: string;
}) => {
  const filledStars = Math.floor(rating);
  const fractionalPart = rating - filledStars;
  const emptyStars = maxRating - filledStars - (fractionalPart > 0 ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(filledStars)].map((_, index) => (
        <Star key={`filled-${index}`} className="h-4 w-4" fill="#FACC15" stroke="#FACC15" />
      ))}
      {fractionalPart > 0 && (
        <Star className="h-4 w-4" fill="#FACC15" stroke="#FACC15" opacity={0.5} />
      )}
      {[...Array(emptyStars)].map((_, index) => (
        <Star key={`empty-${index}`} className="h-4 w-4 text-gray-300" fill="currentColor" />
      ))}
    </div>
  );
};

// Container Scroll Component
const ContainerScroll: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  style,
  className,
  ...props
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start center", "end end"],
  });

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
  );
};

// Cards Container Component
const CardsContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn("relative", className)}
      style={{ perspective: "1000px", ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
};

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
    const { scrollYProgress } = useContainerScrollContext();

    const start = index / (arrayLength + 1);
    const end = (index + 1) / (arrayLength + 1);
    const range = React.useMemo(() => [start, end], [start, end]);
    const rotateRange = [range[0] - 1.5, range[1] / 1.5];

    const y = useTransform(scrollYProgress, range, ["0%", "-180%"]);
    const rotate = useTransform(scrollYProgress, rotateRange, [incrementRotation, 0]);
    const transform = useMotionTemplate`translateZ(${index * incrementZ}px) translateY(${y}) rotate(${rotate}deg)`;

    const dx = useTransform(scrollYProgress, rotateRange, [4, 0]);
    const dy = useTransform(scrollYProgress, rotateRange, [4, 12]);
    const blur = useTransform(scrollYProgress, rotateRange, [2, 24]);
    const alpha = useTransform(scrollYProgress, rotateRange, [0.15, 0.2]);
    const filter =
      variant === "light"
        ? useMotionTemplate`drop-shadow(${dx}px ${dy}px ${blur}px rgba(0,0,0,${alpha}))`
        : "none";

    const cardStyle = {
      top: index * incrementY,
      transform,
      backfaceVisibility: "hidden" as const,
      zIndex: (arrayLength - index) * incrementZ,
      filter,
      ...style,
    };

    return (
      <motion.div
        layout="position"
        ref={ref}
        style={cardStyle}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
CardTransformed.displayName = "CardTransformed";

// Testimonial Card Component (for scroll animation)
const TestimonialCardScrollable = ({
  testimonial,
  index,
  arrayLength,
  variant,
}: {
  testimonial: Testimonial;
  index: number;
  arrayLength: number;
  variant: "light" | "dark";
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const displayText = isExpanded
    ? testimonial.quote
    : testimonial.quote.slice(0, 120) + (testimonial.quote.length > 120 ? "..." : "");

  return (
    <CardTransformed arrayLength={arrayLength} index={index + 2} variant={variant} role="article">
      <div className="absolute -top-3 -left-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#C7A643] to-[#B79638] shadow-lg">
        <Quote className="h-5 w-5 text-white" fill="white" />
      </div>

      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#C7A643] to-[#B79638] text-xl font-bold text-white shadow-md sm:h-16 sm:w-16 sm:text-2xl">
          {testimonial.name.charAt(0)}
        </div>

        <div>
          <h3 className="mb-1 text-xl font-bold text-gray-900">{testimonial.name}</h3>
          {testimonial.profession && (
            <p className="text-sm text-gray-600">{testimonial.profession}</p>
          )}
        </div>

        <ReviewStars rating={testimonial.rating || 5} className="text-[#FACC15]" />

        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Verified User
        </span>

        <blockquote className="text-sm leading-relaxed text-gray-700 italic sm:text-base">
          {displayText}
          {testimonial.quote.length > 120 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 font-medium text-[#C7A643] hover:underline"
            >
              {isExpanded ? "Read less" : "Read more"}
            </button>
          )}
        </blockquote>
      </div>
    </CardTransformed>
  );
};

// Main Testimonials Component
export default function Testimonials({
  companySlug,
  items,
  variant = "light",
  useScrollAnimation = true,
}: TestimonialsProps) {
  const testimonials: Testimonial[] = React.useMemo(() => {
    if (items && items.length > 0) return items;
    if (companySlug) {
      const company = testimonialsByCompany[companySlug.toLowerCase()];
      if (company && company.length > 0) return company;
    }
    return testimonialsByCompany.default;
  }, [companySlug, items]);

  const [currentIndex, setCurrentIndex] = React.useState<number>(0);

  if (!testimonials || testimonials.length === 0) return null;

  // Scroll Animation View
  if (useScrollAnimation) {
    return (
      <section
        aria-labelledby="testimonials"
        className="px-4 py-12"
        style={{ backgroundColor: variant === "dark" ? "#1a1a1a" : "#FAF6E8" }}
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="testimonials"
            className="mb-4 text-center text-3xl font-bold text-gray-900 md:text-4xl"
          >
            What Our Customers Say
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
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
    );
  }

  // Carousel View (original design)
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const currentTestimonial = testimonials[currentIndex];
  const [isExpanded, setIsExpanded] = React.useState(false);
  const displayText = isExpanded
    ? currentTestimonial.quote
    : currentTestimonial.quote.slice(0, 150) + (currentTestimonial.quote.length > 150 ? "..." : "");

  return (
    <section
      aria-labelledby="testimonials"
      className="rounded-2xl border px-4 py-12"
      style={{ backgroundColor: "#FAF6E8" }}
    >
      <h2
        id="testimonials"
        className="mb-10 text-center text-2xl font-semibold text-gray-900 md:text-3xl"
      >
        Our Customers
      </h2>

      <div className="relative mx-auto max-w-4xl">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrev}
            className="z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#C7A643] text-white shadow-md transition hover:bg-[#B79638]"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div className="relative w-full max-w-2xl rounded-3xl border-2 border-[#C7A643] bg-white p-8 shadow-2xl md:p-10">
            <div className="absolute -top-4 -left-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#C7A643] to-[#B79638] shadow-lg">
              <Quote className="h-6 w-6 text-white" fill="white" />
            </div>

            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#C7A643] to-[#B79638] text-2xl font-bold text-white shadow-md">
                {currentTestimonial.name.charAt(0)}
              </div>

              <h3 className="mb-2 text-xl font-bold text-gray-900 md:text-2xl">
                {currentTestimonial.name}
              </h3>
              {currentTestimonial.profession && (
                <p className="mb-3 text-gray-600">{currentTestimonial.profession}</p>
              )}

              <ReviewStars rating={currentTestimonial.rating || 5} />

              <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified User
              </span>
            </div>

            <blockquote className="text-center text-base leading-relaxed text-gray-600 italic md:text-lg">
              {displayText}
              {currentTestimonial.quote.length > 150 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="ml-2 font-medium text-[#C7A643] hover:underline"
                >
                  {isExpanded ? "Read less" : "Read more"}
                </button>
              )}
            </blockquote>
          </div>

          <button
            onClick={handleNext}
            className="z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#C7A643] text-white shadow-md transition hover:bg-[#B79638]"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 w-2 rounded-full transition-all ${
                idx === currentIndex ? "w-6 bg-[#C7A643]" : "bg-gray-400/30 hover:bg-gray-400/60"
              }`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
