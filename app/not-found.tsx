
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";


export default function NotFound() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length) {
      router.push(`/shop?search=${encodeURIComponent(query)}`);
    } else {
      router.push("/shop");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 flex items-center justify-center p-6">
      {/* Soft decorative background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute -left-20 -top-36 w-[520px] h-[520px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle at 30% 30%, #fdf2f8, transparent 40%)" }}
        />
        <div
          className="absolute -right-36 -bottom-28 w-[420px] h-[420px] rounded-full blur-2xl opacity-20 animate-[float_8s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle at 70% 70%, #7c3aed22, transparent 40%)" }}
        />
      </div>

      <div className="relative w-full max-w-5xl border">
        <div className="bg-white  dark:bg-neutral-900 shadow-2xl dark:shadow-black/50 rounded-3xl overflow-hidden border border-neutral-100 dark:border-neutral-800">
      
            {/* Left: content */}
            <section className="p-8 sm:p-10 lg:p-14 flex flex-col justify-center gap-6 border">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <img
                  src="../public/LinkAndSmile2.png"
                  alt="LinkAndSmile"
                  className="h-12 w-auto object-contain rounded-md shadow-sm"
                  onError={(e) => {
                    // fallback to text if image missing
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-500">LinkAndSmile</p>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Premium Healthcare & Wellness
                  </p>
                </div>
              </div>

              <h1 className="text-7xl sm:text-8xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
                404
              </h1>

              <p className="max-w-xl text-neutral-600 dark:text-neutral-300 text-lg">
                Sorry — we couldn’t find the page you were looking for. It may have been moved,
                renamed, or might never have existed. Don’t worry — we’ll get you back to your health journey in seconds.
              </p>

              {/* Search */}
              <form
                onSubmit={handleSubmit}
                className="mt-2 flex w-full max-w-2xl gap-3 items-center"
                role="search"
                aria-label="Search products"
              >
                <label htmlFor="site-search" className="sr-only">
                  Search products
                </label>
                <input
                  id="site-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search for products, services, labs..."
                  className="flex-1 min-w-0 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:ring-2 focus:ring-primary/40 outline-none transition"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow hover:brightness-105 focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  Search
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <Link
                  href="/"
                  className="inline-block px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Home
                </Link>

                <Link
                  href="/shop"
                  className="inline-block px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-95"
                >
                  Browse Shop
                </Link>

                <Link
                  href="/contact-us"
                  className="inline-block px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Contact Us
                </Link>

                <a
                  href="mailto:info@linkandsmile.com?subject=Broken%20link%20on%20site%20404"
                  className="inline-block px-4 py-2 rounded-lg text-sm text-neutral-600 hover:underline"
                >
                  Report this page
                </a>
              </div>

              {/* Small reassurance / UX */}
              <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
                Pro tip: If you were sent here from a link, try searching for the product name or
                check out our{" "}
                <Link href="/shop" className="underline">
                  shop
                </Link>
                .
              </p>
            </section>

          
          
        </div>


      </div>

      {/* Inline keyframes for float animation (Tailwind doesn't provide this by default) */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(18px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        .animate-[float_8s_ease-in-out_infinite] {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
