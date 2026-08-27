"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Scale, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

const sectionIcons = [FileText, Shield, Scale, FileText, Shield, Scale, FileText, Shield, Scale];

export default function TermsOfService() {
  const t = useTranslations("TermsOfServicePage");
  const [openSection, setOpenSection] = useState(1);

  const sections = sectionIcons.map((icon, i) => ({
    id: i + 1,
    title: t(`section${i + 1}Title` as "section1Title"),
    icon,
    content: t(`section${i + 1}Content` as "section1Content"),
  }));

  const toggleSection = (id: number | string) => {
    setOpenSection(openSection === id ? null : (id as any));
  };

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
            <Scale className="h-10 w-10 text-[#B18D0C]" />
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            {t("heroTitle")} <span className="text-[#B18D0C]">{t("heroTitleAccent")}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-300 md:text-xl">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 text-sm text-neutral-400">{t("lastUpdated")}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        {/* Important Notice */}
        <div className="mb-12 rounded-e-xl border-s-4 border-[#B18D0C] bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 p-6">
          <div className="flex items-start gap-4">
            <Shield className="mt-1 h-6 w-6 flex-shrink-0 text-[#B18D0C]" />
            <div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">{t("noticeTitle")}</h3>
              <p className="leading-relaxed text-neutral-700">{t("noticeBody")}</p>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = openSection === section.id;

            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-md transition-all duration-300 hover:shadow-xl"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between px-8 py-6 text-start transition-colors hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-[#B18D0C]/10 p-3">
                      <Icon className="h-6 w-6 text-[#B18D0C]" />
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900">{section.title}</h3>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-6 w-6 text-[#B18D0C]" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-neutral-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-8 pt-2 pb-8">
                    <div className="ps-16">
                      <p className="leading-relaxed whitespace-pre-line text-neutral-700">
                        {section.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Section */}
        <div className="mt-16 rounded-2xl bg-neutral-900 p-8 text-center md:p-12">
          <h3 className="mb-4 text-3xl font-bold text-white">{t("contactTitle")}</h3>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-neutral-300">{t("contactBody")}</p>
          <a
            href="mailto:care@instapeels.com"
            className="inline-block rounded-xl bg-[#B18D0C] px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#8A6A09] hover:shadow-xl"
          >
            {t("contactButton")}
          </a>
        </div>
      </div>
    </section>
  );
}
