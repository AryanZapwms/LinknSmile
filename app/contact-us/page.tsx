// app/contact-us/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock, Shield, Truck, Store, ChevronRight } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useTranslations } from "next-intl";

export default function ContactUs() {
  const { supportEmail, supportPhone, brandTagline } = usePlatformSettings();
  const t = useTranslations("ContactUsPage");
  const supportPhoneHref = `tel:${supportPhone.replace(/\s/g, "")}`;

  // A function, not a module-level constant, because "Call Us"/"Email Us" need
  // the admin-editable supportPhone/supportEmail (usePlatformSettings) — those
  // can only be read inside the component. sellers@linknsmile.com is a
  // genuinely separate address (seller-specific, never wired to supportEmail)
  // left as a literal, same as the second bulk-order phone number elsewhere.
  const contactCards = [
    {
      icon: MapPin,
      title: t("visitOfficeTitle"),
      content: (
        <address className="text-sm leading-relaxed text-stone-600 not-italic whitespace-pre-line">
          {t("officeAddress")}
        </address>
      ),
    },
    {
      icon: Phone,
      title: t("callUsTitle"),
      content: (
        <div className="space-y-3">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
              {t("customerSupportLabel")}
            </p>
            <a
              href={supportPhoneHref}
              className="text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
            >
              {supportPhone}
            </a>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
              {t("sellerSupportLabel")}
            </p>
            <a
              href={supportPhoneHref}
              className="text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
            >
              {supportPhone}
            </a>
          </div>
        </div>
      ),
    },
    {
      icon: Mail,
      title: t("emailUsTitle"),
      content: (
        <div className="space-y-2">
          <a
            href={`mailto:${supportEmail}`}
            className="block text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
          >
            {supportEmail}
          </a>
          <a
            href="mailto:sellers@linknsmile.com"
            className="block text-sm font-semibold text-stone-800 transition-colors hover:text-amber-600"
          >
            sellers@linknsmile.com
          </a>
          <p className="mt-1 text-xs text-stone-400">{t("respondWithin24h")}</p>
        </div>
      ),
    },
    {
      icon: Clock,
      title: t("businessHoursTitle"),
      content: (
        <div className="space-y-1 text-sm text-stone-600">
          <div className="flex justify-between">
            <span>{t("mondaySaturday")}</span>
            <span className="font-semibold text-stone-800">{t("mondaySaturdayHours")}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("sunday")}</span>
            <span className="font-medium text-red-400">{t("closed")}</span>
          </div>
        </div>
      ),
    },
  ];

  const sellerSteps = [
    { step: "1", title: t("sellerStep1Title"), desc: t("sellerStep1Desc") },
    { step: "2", title: t("sellerStep2Title"), desc: t("sellerStep2Desc") },
    { step: "3", title: t("sellerStep3Title"), desc: t("sellerStep3Desc") },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────── */}
      <section className="relative overflow-hidden bg-stone-900 px-4 py-18 md:py-24">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="pointer-events-none absolute top-0 left-1/2 h-[250px] w-[500px] -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-3xl py-8 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-amber-300 uppercase">
            <Mail className="h-3.5 w-3.5" />
            {t("heroBadge")}
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-white md:text-5xl">
            {t("heroTitle")} <span className="text-amber-400">{t("heroTitleAccent")}</span>
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-300 md:text-base">
            {t("heroSubtitle")}
          </p>
          <p className="mt-5 text-xs font-semibold tracking-widest text-amber-400/60 uppercase">
            {brandTagline}
          </p>
        </div>
      </section>

      {/* ── Main content ─────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {/* Contact cards */}
          <div className="space-y-4">
            {contactCards.map(({ icon: Icon, title, content }) => (
              <div
                key={title}
                className="rounded-2xl border border-stone-100 bg-white p-5 transition-all duration-200 hover:border-amber-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                    <Icon className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="mb-2 text-xs font-bold tracking-wider text-stone-400 uppercase">
                      {title}
                    </p>
                    {content}
                  </div>
                </div>
              </div>
            ))}

            {/* Trust pills */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, label: t("verifiedSellers") },
                { icon: Truck, label: t("fastDelivery") },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50 p-3.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                    <Icon className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs font-semibold text-stone-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map + CTA */}
          <div className="space-y-5 lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                  <MapPin className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">{t("findUsTitle")}</p>
                  <p className="text-xs text-stone-400">{t("findUsSubtitle")}</p>
                </div>
              </div>
              <iframe
                loading="lazy"
                src="https://maps.google.com/maps?q=Healthcare%20Medical%20Center%2C%20S-95%2C%20whispering%20plains%2C%20shopping%20Corner%2C%20Mumbra%2C%20Kandiwali%20road%2C%20Kandivali%20%28E%29%2C%20Mumbai%20Maharashtra%20India%2C%20400101&t=m&z=16&output=embed&iwloc=near"
                title="Linknsmile Office Location"
                aria-label="Office location map"
                className="h-[340px] w-full border-0"
                allowFullScreen
              />
            </div>

            {/* CTA card */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <h4 className="mb-1.5 text-base font-bold text-stone-900">
                {t("needAssistanceTitle")}
              </h4>
              <p className="mb-5 text-sm leading-relaxed text-stone-500">
                {t("needAssistanceBody")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`tel:${supportPhone.replace(/\s/g, "")}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-amber-500"
                >
                  <Phone className="h-4 w-4" />
                  {t("callUsButton")}
                </a>
                <a
                  href="mailto:sellers@linknsmile.com"
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-stone-200 py-3 text-sm font-bold text-stone-700 transition-all duration-200 hover:border-amber-400 hover:bg-amber-50"
                >
                  <Store className="h-4 w-4" />
                  {t("sellWithUsButton")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seller onboarding ─────────────── */}
      <section className="border-y border-stone-100 bg-stone-50 px-4 py-14">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold tracking-widest text-amber-600 uppercase">
            {t("growBusinessEyebrow")}
          </p>
          <h2 className="mb-3 text-2xl font-bold text-stone-900 md:text-3xl">
            {t("startSellingTitle")}
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-500">
            {t("startSellingBody")}
          </p>
        </div>

        <div className="mx-auto mb-8 grid max-w-3xl grid-cols-3 gap-4">
          {sellerSteps.map(({ step, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl border border-stone-100 bg-white p-5 text-center"
            >
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-700">
                {step}
              </div>
              <p className="mb-1 text-sm font-bold text-stone-900">{title}</p>
              <p className="text-xs text-stone-400">{desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/register-as-seller"
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-7 py-3 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-amber-500"
          >
            {t("registerAsSeller")}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>

      {/* ── Footer strip ─────────────────── */}
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row">
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <Link href="/about-us" className="transition-colors hover:text-amber-600">
            {t("aboutUs")}
          </Link>
          <span>·</span>
          <Link href="/privacy-policy" className="transition-colors hover:text-amber-600">
            {t("privacyPolicy")}
          </Link>
          <span>·</span>
          <Link href="/termsofservice" className="transition-colors hover:text-amber-600">
            {t("termsLink")}
          </Link>
        </div>
        <p className="text-xs text-stone-400">
          {t("footerCopyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </main>
  );
}
