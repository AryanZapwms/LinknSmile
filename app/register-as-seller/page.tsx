import Link from "next/link";

export default function RegisterAsSellerPage() {
  return (
    <main className="min-h-screen bg-[#1a1508]">
      {/* Hero Section */}
      <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 lg:grid-cols-2">
        {/* Left: Copy */}
        <div>
          <span className="mb-6 inline-block rounded-full border border-[#f5a623]/30 bg-[#2a1f06] px-4 py-1.5 text-sm font-semibold tracking-wide text-[#f5a623]">
            🇮🇳 Made in India · Sell to India
          </span>
          <h1 className="mb-6 text-5xl leading-tight font-extrabold text-white">
            Grow Your Business with <span className="text-[#f5a623]">LinkAndSmile</span>
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-gray-400">
            Join thousands of verified local sellers reaching buyers across India. List your
            products, manage orders, and get paid — all in one place.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/register-vendor"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f5a623] px-8 py-4 text-base font-bold text-[#1a1508] transition-all hover:bg-[#e09510] active:scale-95"
            >
              Register Now →
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/5"
            >
              How it works
            </a>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Free to join · No listing fees · Payments directly to your account
          </p>
        </div>

        {/* Right: Stats card */}
        <div className="space-y-6 rounded-3xl border border-white/10 bg-[#221b07] p-8">
          <p className="text-sm font-semibold tracking-widest text-gray-500 uppercase">
            Why sell with us
          </p>
          {[
            { icon: "🛒", label: "Active Buyers", value: "10,000+", sub: "Growing every day" },
            { icon: "📦", label: "Orders Fulfilled", value: "50,000+", sub: "Across India" },
            { icon: "💸", label: "Seller Payouts", value: "₹2Cr+", sub: "Paid out this year" },
            { icon: "⭐", label: "Seller Rating", value: "4.8 / 5", sub: "Average satisfaction" },
          ].map(({ icon, label, value, sub }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#f5a623]/10 text-xl">
                {icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
              <span className="hidden text-xs text-gray-600 sm:block">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-white/10 bg-[#1f1706] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold text-white">
            Start selling in 3 simple steps
          </h2>
          <p className="mb-14 text-center text-gray-500">No technical knowledge required</p>
          <div className="grid gap-8 md:grid-cols-3">
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
              <div key={step} className="group relative">
                <div className="mb-4 text-6xl leading-none font-black text-[#f5a623]/10 transition-colors select-none group-hover:text-[#f5a623]/20">
                  {step}
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-14 text-center text-3xl font-bold text-white">
          Everything you need to succeed
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🚚",
              title: "Fast Delivery Network",
              desc: "We handle logistics so you focus on products.",
            },
            {
              icon: "🔒",
              title: "Secure Payments",
              desc: "UPI, cards, net banking — all covered.",
            },
            {
              icon: "📊",
              title: "Seller Dashboard",
              desc: "Track sales, returns, and earnings in real time.",
            },
            {
              icon: "✅",
              title: "Verified Badge",
              desc: "Build trust with buyers through our seller verification.",
            },
            {
              icon: "🤝",
              title: "Dedicated Support",
              desc: "Our team is just a call or WhatsApp away.",
            },
            {
              icon: "📣",
              title: "Marketing Boost",
              desc: "Get featured in curated collections and promotions.",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/10 bg-[#221b07] p-6 transition-all hover:border-[#f5a623]/40"
            >
              <div className="mb-4 text-3xl">{icon}</div>
              <h3 className="mb-1 font-semibold text-white transition-colors group-hover:text-[#f5a623]">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-[#f5a623] p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-[#1a1508]">Ready to grow your business?</h2>
          <p className="mb-8 text-[#1a1508]/70">
            Join the LinkAndSmile seller community today — it&apos;s free.
          </p>
          <Link
            href="/auth/register-vendor"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1508] px-10 py-4 font-bold text-[#f5a623] transition-all hover:bg-[#2a2510] active:scale-95"
          >
            Get Started for Free →
          </Link>
        </div>
      </section>
    </main>
  );
}
