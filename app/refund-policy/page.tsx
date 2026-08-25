"use client";

import React from "react";
import { Package, RefreshCw, Shield, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useTranslations } from "next-intl";

const stepIcons = [Package, Shield, Mail, RefreshCw];

export default function RefundPolicy() {
  const { supportEmail, supportPhone } = usePlatformSettings();
  const t = useTranslations("RefundPolicyPage");

  const policySteps = stepIcons.map((icon, i) => ({
    step: i + 1,
    title: t(`step${i + 1}Title` as "step1Title"),
    icon,
    description: t(`step${i + 1}Description` as "step1Description", { supportEmail }),
  }));

  const keyPoints = [
    {
      id: "eligible",
      icon: CheckCircle,
      title: t("eligibleTitle"),
      items: [
        t("eligibleItem1"),
        t("eligibleItem2"),
        t("eligibleItem3"),
        t("eligibleItem4"),
      ],
    },
    {
      id: "nonReturnable",
      icon: AlertCircle,
      title: t("nonReturnableTitle"),
      items: [
        t("nonReturnableItem1"),
        t("nonReturnableItem2"),
        t("nonReturnableItem3"),
        t("nonReturnableItem4"),
      ],
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 start-10 h-72 w-72 rounded-full bg-[#B18D0C] blur-3xl"></div>
          <div className="absolute end-10 bottom-20 h-96 w-96 rounded-full bg-[#B18D0C] blur-3xl"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-[#B18D0C]/20">
            <RefreshCw className="h-10 w-10 text-[#B18D0C]" />
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            {t("heroTitle")} <span className="text-[#B18D0C]">{t("heroTitleAccent")}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-300 md:text-xl">
            {t("heroSubtitle")}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        {/* Policy Highlight */}
        <div className="mb-16 rounded-2xl bg-gradient-to-r from-[#B18D0C] to-[#8A6A09] p-8 text-center shadow-xl md:p-12">
          <h2 className="mb-4 text-4xl font-bold text-white">{t("highlightTitle")}</h2>
          <p className="mx-auto max-w-2xl text-xl text-neutral-100">{t("highlightBody")}</p>
        </div>

        {/* Return Process Steps */}
        <div className="mb-20">
          <h3 className="mb-12 text-center text-3xl font-bold text-neutral-900">
            {t("howReturnsWork")}
          </h3>
          <div className="grid gap-8 md:grid-cols-2">
            {policySteps.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex-shrink-0 rounded-xl bg-[#B18D0C]/10 p-4">
                      <Icon className="h-8 w-8 text-[#B18D0C]" />
                    </div>
                    <div>
                      <div className="mb-2 inline-block rounded-full bg-[#B18D0C] px-3 py-1 text-sm font-bold text-white">
                        {t("stepLabel", { step: item.step })}
                      </div>
                      <h4 className="mb-2 text-xl font-semibold text-neutral-900">{item.title}</h4>
                    </div>
                  </div>
                  <p className="ms-20 leading-relaxed text-neutral-700">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Eligible vs Non-Eligible */}
        <div className="mb-16 grid gap-8 md:grid-cols-2">
          {keyPoints.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div
                    className={`rounded-xl p-4 ${
                      section.id === "eligible" ? "bg-green-100" : "bg-orange-100"
                    }`}
                  >
                    <Icon
                      className={`h-8 w-8 ${
                        section.id === "eligible" ? "text-green-600" : "text-orange-600"
                      }`}
                    />
                  </div>
                  <h4 className="text-2xl font-bold text-neutral-900">{section.title}</h4>
                </div>
                <ul className="space-y-3">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div
                        className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${
                          section.id === "eligible" ? "bg-green-600" : "bg-orange-600"
                        }`}
                      ></div>
                      <span className="text-neutral-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Additional Information */}
        <div className="mb-16 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 md:p-12">
          <h3 className="mb-6 text-2xl font-bold text-neutral-900">{t("importantInfoTitle")}</h3>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                <Package className="h-5 w-5 text-[#B18D0C]" />
                {t("damagesTitle")}
              </h4>
              <p className="leading-relaxed text-neutral-700">{t("damagesBody")}</p>
            </div>
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                <RefreshCw className="h-5 w-5 text-[#B18D0C]" />
                {t("exchangesTitle")}
              </h4>
              <p className="leading-relaxed text-neutral-700">{t("exchangesBody")}</p>
            </div>
          </div>
        </div>

        {/* Refund Timeline */}
        <div className="mb-16 rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg md:p-12">
          <h3 className="mb-6 text-center text-2xl font-bold text-neutral-900">
            {t("timelineTitle")}
          </h3>
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                1
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900">{t("timeline1Title")}</h4>
                <p className="text-neutral-600">{t("timeline1Body")}</p>
              </div>
            </div>
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                2
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900">{t("timeline2Title")}</h4>
                <p className="text-neutral-600">{t("timeline2Body")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                3
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900">{t("timeline3Title")}</h4>
                <p className="text-neutral-600">{t("timeline3Body")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-8 text-center md:p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 end-0 h-64 w-64 rounded-full bg-[#B18D0C] blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <h3 className="mb-4 text-3xl font-bold text-white">{t("ctaTitle")}</h3>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-neutral-300">{t("ctaBody")}</p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B18D0C] px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#8A6A09] hover:shadow-xl"
              >
                <Mail className="h-5 w-5" />
                {t("emailSupportButton")}
              </a>
              <a
                href={`tel:${supportPhone.replace(/\s/g, "")}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-neutral-900 shadow-lg transition-all duration-300 hover:bg-neutral-100 hover:shadow-xl"
              >
                <Package className="h-5 w-5" />
                {t("callUsButton")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
