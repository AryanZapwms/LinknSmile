import Link from "next/link"

export default function RegisterAsSellerPage() {
  return (
    <main className="min-h-screen bg-[#1a1508]">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left: Copy */}
        <div>
          <span className="inline-block bg-[#2a1f06] border border-[#f5a623]/30 text-[#f5a623] text-sm font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide">
            🇮🇳 Made in India · Sell to India
          </span>
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Grow Your Business with{" "}
            <span className="text-[#f5a623]">LinkAndSmile</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 leading-relaxed">
            Join thousands of verified local sellers reaching buyers across India.
            List your products, manage orders, and get paid — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auth/register-vendor"
              className="inline-flex items-center justify-center gap-2 bg-[#f5a623] text-[#1a1508] px-8 py-4 rounded-xl text-base font-bold hover:bg-[#e09510] active:scale-95 transition-all"
            >
              Register Now →
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-white/5 transition-all"
            >
              How it works
            </a>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Free to join · No listing fees · Payments directly to your account
          </p>
        </div>

        {/* Right: Stats card */}
        <div className="bg-[#221b07] rounded-3xl border border-white/10 p-8 space-y-6">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
            Why sell with us
          </p>
          {[
            { icon: "🛒", label: "Active Buyers", value: "10,000+", sub: "Growing every day" },
            { icon: "📦", label: "Orders Fulfilled", value: "50,000+", sub: "Across India" },
            { icon: "💸", label: "Seller Payouts", value: "₹2Cr+", sub: "Paid out this year" },
            { icon: "⭐", label: "Seller Rating", value: "4.8 / 5", sub: "Average satisfaction" },
          ].map(({ icon, label, value, sub }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#f5a623]/10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
                {icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
              <span className="text-xs text-gray-600 hidden sm:block">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-[#1f1706] border-y border-white/10 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-white mb-2">
            Start selling in 3 simple steps
          </h2>
          <p className="text-center text-gray-500 mb-14">
            No technical knowledge required
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create your seller account",
                desc: "Register with your business details. Verification takes less than 24 hours.",
              },
              {
                step: "02",
                title: "List your products",
                desc: "Add photos, descriptions, and prices. We'll help you reach the right buyers.",
              },
              {
                step: "03",
                title: "Get paid instantly",
                desc: "Receive direct payouts to your bank account after every successful order.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative group">
                <div className="text-6xl font-black text-[#f5a623]/10 group-hover:text-[#f5a623]/20 transition-colors select-none mb-4 leading-none">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-14">
          Everything you need to succeed
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "🚚", title: "Fast Delivery Network", desc: "We handle logistics so you focus on products." },
            { icon: "🔒", title: "Secure Payments", desc: "UPI, cards, net banking — all covered." },
            { icon: "📊", title: "Seller Dashboard", desc: "Track sales, returns, and earnings in real time." },
            { icon: "✅", title: "Verified Badge", desc: "Build trust with buyers through our seller verification." },
            { icon: "🤝", title: "Dedicated Support", desc: "Our team is just a call or WhatsApp away." },
            { icon: "📣", title: "Marketing Boost", desc: "Get featured in curated collections and promotions." },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-[#221b07] rounded-2xl border border-white/10 hover:border-[#f5a623]/40 transition-all p-6 group"
            >
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-[#f5a623] transition-colors">
                {title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-[#f5a623] rounded-3xl p-12 text-center relative overflow-hidden">
          <h2 className="text-3xl font-bold text-[#1a1508] mb-4">
            Ready to grow your business?
          </h2>
          <p className="text-[#1a1508]/70 mb-8">
            Join the LinkAndSmile seller community today — it&apos;s free.
          </p>
          <Link
            href="/auth/register-vendor"
            className="inline-flex items-center gap-2 bg-[#1a1508] text-[#f5a623] font-bold px-10 py-4 rounded-xl hover:bg-[#2a2510] active:scale-95 transition-all"
          >
            Get Started for Free →
          </Link>
        </div>
      </section>
    </main>
  )
}