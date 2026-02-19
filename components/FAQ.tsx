import React, { useState } from "react"
import { Plus, Minus } from "lucide-react"

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps {
  companySlug?: string
  items?: FAQItem[]
}

// FAQ data organized by company
const faqByCompany: Record<string, FAQItem[]> = {
  instapeels: [
    {
      question: "Does Instapeels Complete Kit help reduce acne marks and dullness?",
      answer:
        "Yes, the Instapeels Complete Kit is formulated with gentle exfoliating acids and brightening agents that help reduce acne marks, pigmentation, and dullness while improving overall skin texture.",
    },
    {
      question: "What are the main benefits of the Instapeels Complete Kit for achieving glass skin?",
      answer:
        "The kit provides deep exfoliation, hydration, and radiance, helping you achieve smooth, even-toned, and luminous 'glass-like' skin with regular use.",
    },
    {
      question: "Is the Instapeels Complete Kit suitable for oily, dry, and combination skin types?",
      answer:
        "Yes, it’s dermatologically tested and suitable for all skin types including oily, dry, and combination skin.",
    },
    {
      question: "How often should I use the Instapeels kit?",
      answer:
        "Use the kit 2-3 times a week depending on your skin type and tolerance. Avoid using it on consecutive days to allow your skin to recover.",
    },
    {
      question: "Can I use Instapeels products along with my regular skincare routine?",
      answer:
        "Yes, you can continue your regular routine, but avoid using strong actives like retinol or AHAs on the same day as Instapeels to prevent irritation.",
    },
  ],

  dermaflay: [
    {
      question: "What makes Dermaflay products unique?",
      answer:
        "Dermaflay combines advanced dermatological science with naturally derived ingredients to deliver high-performance skincare that’s safe and effective.",
    },
    {
      question: "Are Dermaflay products suitable for sensitive skin?",
      answer:
        "Yes, Dermaflay formulations are dermatologically tested and suitable for sensitive skin. However, we recommend a patch test before use.",
    },
    {
      question: "How long does shipping take for Dermaflay products?",
      answer:
        "Standard shipping takes 3-5 business days across India. Express delivery options are available during checkout.",
    },
    {
      question: "Can I use Dermaflay Moisturizers daily?",
      answer:
        "Yes, Dermaflay Moisturizers are designed for daily use. For best results, apply twice a day — morning and night — followed by sunscreen during the day.",
    },
    {
      question: "Are Dermaflay products cruelty-free and vegan?",
      answer:
        "Absolutely. All Dermaflay products are 100% cruelty-free and vegan, formulated without animal testing or animal-derived ingredients.",
    },
  ],

  vibrissa: [
    {
      question: "What is Vibrissa and what does it do?",
      answer:
        "Vibrissa is a targeted men’s grooming brand designed to address beard growth, scalp health, and overall skin rejuvenation using clinically proven ingredients.",
    },
    {
      question: "Does the Vibrissa Beard Growth Serum really work?",
      answer:
        "Yes, Vibrissa Beard Growth Serum contains potent actives like Redensyl and Biotin that stimulate dormant hair follicles, promoting thicker and fuller beard growth over time.",
    },
    {
      question: "Is Vibrissa suitable for all beard types and skin tones?",
      answer:
        "Yes, Vibrissa products are suitable for all beard types and skin tones. They are dermatologically tested and formulated to be non-irritating.",
    },
    {
      question: "How long before I see visible results with Vibrissa?",
      answer:
        "Results vary by individual, but most users notice visible improvements in 4–6 weeks of consistent use.",
    },
    {
      question: "Can I use Vibrissa products with other grooming or skincare items?",
      answer:
        "Yes, Vibrissa products are designed to integrate seamlessly with your existing grooming routine. Just ensure you apply them on clean, dry skin or hair for best absorption.",
    },
  ],

  // Default FAQs (for other companies or fallback)
  default: [
    {
      question: "What is your return policy?",
      answer:
        "We offer a 30-day return policy for unopened and unused products. Please contact our customer service for detailed return instructions.",
    },
    {
      question: "How do I track my order?",
      answer:
        "Once your order ships, you'll receive a tracking number via email or SMS. You can use this to track your shipment in real-time.",
    },
    {
      question: "Are the products cruelty-free?",
      answer:
        "Yes, all our partnered brands are cruelty-free and never test on animals.",
    },
  ],
}


export default function FAQ({ companySlug, items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  // Determine which FAQs to show
  const getFAQs = (): FAQItem[] => {
    // If custom items provided, use them
    if (items && items.length > 0) {
      return items
    }
    
    // If company slug provided, look up company-specific FAQs
    if (companySlug) {
      const companyFAQs = faqByCompany[companySlug.toLowerCase()]
      if (companyFAQs) {
        return companyFAQs
      }
    }
    
    // Fall back to default FAQs
    return faqByCompany.default
  }

  const faqs = getFAQs()

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  if (faqs.length === 0) {
    return null
  }

  return (
    <section className="bg-[#FFFCF7] max-w-3xl mx-auto p-6 sm:p-10 mt-8">
      <h2 className="text-center font-semibold text-lg mb-6">FAQ</h2>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border-b border-gray-300 pb-3 last:border-none"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="cursor-pointer w-full flex justify-between items-center text-left text-sm sm:text-base font-medium text-gray-800 focus:outline-none"
            >
              <span>{faq.question}</span>
              {openIndex === index ? (
                <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 flex-shrink-0 ml-2 cursor-pointer"  />
              ) : (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 flex-shrink-0 ml-2 cursor-pointer" />
              )}
            </button>

            {openIndex === index && (
              <div className="mt-2 text-gray-600 text-sm sm:text-base leading-relaxed transition-all duration-300 ease-in-out">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}