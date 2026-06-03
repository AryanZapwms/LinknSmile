"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logo from "@/public/LinkAndSmileLogo.png";

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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-50 to-white p-6 dark:from-neutral-900 dark:to-neutral-950">
      {/* Soft decorative background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute -top-36 -left-20 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle at 30% 30%, #fdf2f8, transparent 40%)" }}
        />
        <div
          className="absolute -right-36 -bottom-28 h-[420px] w-[420px] animate-[float_8s_ease-in-out_infinite] rounded-full opacity-20 blur-2xl"
          style={{ background: "radial-gradient(circle at 70% 70%, #7c3aed22, transparent 40%)" }}
        />
      </div>

      <div className="relative w-full max-w-5xl border">
        <div className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/50">
          {/* Left: content */}
          <section className="flex flex-col justify-center gap-6 border p-8 sm:p-10 lg:p-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image
                src={logo}
                alt="LinkAndSmile"
                width={150}
                height={48}
                className="h-12 w-auto rounded-md object-contain shadow-sm"
              />
            </div>

            <h1 className="text-7xl leading-none font-extrabold tracking-tight text-neutral-900 sm:text-8xl dark:text-neutral-50">
              404
            </h1>

            <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-300">
              Sorry — we couldn’t find the page you were looking for. It may have been moved,
              renamed, or might never have existed. Don’t worry — we’ll get you back to your health
              journey in seconds.
            </p>

            {/* Search */}
            <form
              onSubmit={handleSubmit}
              className="mt-2 flex w-full max-w-2xl items-center gap-3"
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
                className="focus:ring-primary/40 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition outline-none placeholder:text-neutral-400 focus:ring-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
              />
              <button
                type="submit"
                className="from-primary to-primary/80 focus-visible:ring-primary/20 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-3 font-semibold text-white shadow hover:brightness-105 focus-visible:ring-4"
              >
                Search
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-block rounded-lg border border-neutral-200 px-4 py-2 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Home
              </Link>

              <Link
                href="/shop"
                className="bg-primary inline-block rounded-lg px-4 py-2 font-medium text-white hover:opacity-95"
              >
                Browse Shop
              </Link>

              <Link
                href="/contact-us"
                className="inline-block rounded-lg border border-neutral-200 px-4 py-2 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Contact Us
              </Link>

              <a
                href="mailto:info@linkandsmile.com?subject=Broken%20link%20on%20site%20404"
                className="inline-block rounded-lg px-4 py-2 text-sm text-neutral-600 hover:underline"
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
