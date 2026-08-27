"use client";

import React, { useState } from "react";
import { Shield, Eye, Lock, UserCheck, Cookie, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

const sectionIcons = [Eye, UserCheck, Lock, Cookie, Shield, UserCheck];

export default function PrivacyPolicy() {
  const t = useTranslations("PrivacyPolicyPage");
  const [activeTab, setActiveTab] = useState(1);

  const privacySections = sectionIcons.map((icon, i) => ({
    id: i + 1,
    title: t(`section${i + 1}Title` as "section1Title"),
    icon,
    content: t(`section${i + 1}Content` as "section1Content"),
  }));

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
            <Shield className="h-10 w-10 text-[#B18D0C]" />
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
        {/* Trust Badge */}
        <div className="mb-12 rounded-e-xl border-s-4 border-[#B18D0C] bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 p-6">
          <div className="flex items-start gap-4">
            <Lock className="mt-1 h-6 w-6 flex-shrink-0 text-[#B18D0C]" />
            <div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                {t("trustBadgeTitle")}
              </h3>
              <p className="leading-relaxed text-neutral-700">{t("trustBadgeBody")}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-12 overflow-x-auto">
          <div className="flex min-w-max gap-2 pb-4">
            {privacySections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-3 rounded-xl px-6 py-4 font-semibold whitespace-nowrap transition-all duration-300 ${
                    activeTab === section.id
                      ? "bg-[#B18D0C] text-white shadow-lg"
                      : "bg-white text-neutral-700 shadow-md hover:bg-neutral-50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Display */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-xl md:p-12">
          {privacySections.map((section) => {
            const Icon = section.icon;
            if (section.id === activeTab) {
              return (
                <div key={section.id} className="animate-fadeIn">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="rounded-xl bg-[#B18D0C]/10 p-4">
                      <Icon className="h-8 w-8 text-[#B18D0C]" />
                    </div>
                    <h2 className="text-3xl font-bold text-neutral-900">{section.title}</h2>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <p className="leading-relaxed whitespace-pre-line text-neutral-700">
                      {section.content}
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Contact Section */}
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-neutral-900 p-8 text-white">
            <Mail className="mb-4 h-12 w-12 text-[#B18D0C]" />
            <h3 className="mb-4 text-2xl font-bold">{t("dataProtectedTitle")}</h3>
            <p className="mb-6 text-neutral-300">{t("dataProtectedBody")}</p>
            <a
              href="mailto:care@instapeels.com"
              className="inline-block rounded-xl bg-[#B18D0C] px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-[#8A6A09]"
            >
              {t("emailUsButton")}
            </a>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#B18D0C] to-[#8A6A09] p-8 text-white">
            <Shield className="mb-4 h-12 w-12 text-white" />
            <h3 className="mb-4 text-2xl font-bold">{t("dataProtectionTitle")}</h3>
            <p className="mb-4 whitespace-pre-line text-neutral-100">
              {t("dataProtectionAddress")}
            </p>
            <p className="text-sm text-neutral-200">{t("lastUpdatedShort")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
