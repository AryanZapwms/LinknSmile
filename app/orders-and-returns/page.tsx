"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  Package,
  Truck,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
} from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useTranslations } from "next-intl";

export default function OrdersReturns() {
  const [activeTab, setActiveTab] = useState("ordering");
  const { supportEmail, supportPhone } = usePlatformSettings();
  const t = useTranslations("OrdersAndReturnsPage");

  const tabs = [
    { id: "ordering", label: t("tabOrdering"), icon: ShoppingBag },
    { id: "shipping", label: t("tabShipping"), icon: Truck },
    { id: "returns", label: t("tabReturns"), icon: RotateCcw },
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
            <Package className="h-10 w-10 text-[#B18D0C]" />
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            {t("heroTitle")} <span className="text-[#B18D0C]">{t("heroTitleAccent")}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-300 md:text-xl">
            {t("heroSubtitle")}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-6">
        <div className="flex flex-wrap justify-center gap-2 rounded-2xl bg-white p-2 shadow-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 rounded-xl px-6 py-4 font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-[#B18D0C] text-white shadow-lg"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Ordering Tab */}
        {activeTab === "ordering" && (
          <div className="space-y-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-neutral-900">{t("orderingTitle")}</h2>
              <p className="mx-auto max-w-2xl text-lg text-neutral-600">
                {t("orderingSubtitle")}
              </p>
            </div>

            <div className="mb-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-lg transition-all hover:shadow-xl">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B18D0C]/10">
                  <ShoppingBag className="h-8 w-8 text-[#B18D0C]" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-900">
                  {t("browseProductsTitle")}
                </h3>
                <p className="text-neutral-600">{t("browseProductsDesc")}</p>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-lg transition-all hover:shadow-xl">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B18D0C]/10">
                  <CheckCircle2 className="h-8 w-8 text-[#B18D0C]" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-900">
                  {t("secureCheckoutTitle")}
                </h3>
                <p className="text-neutral-600">{t("secureCheckoutDesc")}</p>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-lg transition-all hover:shadow-xl">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B18D0C]/10">
                  <Truck className="h-8 w-8 text-[#B18D0C]" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-900">
                  {t("fastDeliveryTitle")}
                </h3>
                <p className="text-neutral-600">{t("fastDeliveryDesc")}</p>
              </div>
            </div>

            <div className="rounded-e-xl border-s-4 border-[#B18D0C] bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 p-6">
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-neutral-900">
                <AlertTriangle className="h-5 w-5 text-[#B18D0C]" />
                {t("orderVerificationTitle")}
              </h4>
              <p className="text-neutral-700">{t("orderVerificationBody")}</p>
            </div>
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === "shipping" && (
          <div className="space-y-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-neutral-900">{t("shippingTitle")}</h2>
              <p className="mx-auto max-w-2xl text-lg text-neutral-600">
                {t("shippingSubtitle")}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-xl bg-[#B18D0C]/10 p-4">
                    <Clock className="h-8 w-8 text-[#B18D0C]" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900">
                    {t("deliveryTimeTitle")}
                  </h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-[#B18D0C]"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">{t("metroCities")}</p>
                      <p className="text-neutral-600">{t("metroCitiesDays")}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-[#B18D0C]"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">{t("otherCities")}</p>
                      <p className="text-neutral-600">{t("otherCitiesDays")}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-[#B18D0C]"></div>
                    <div>
                      <p className="font-semibold text-neutral-900">{t("remoteAreas")}</p>
                      <p className="text-neutral-600">{t("remoteAreasDays")}</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-xl bg-[#B18D0C]/10 p-4">
                    <Package className="h-8 w-8 text-[#B18D0C]" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900">{t("packagingTitle")}</h3>
                </div>
                <p className="mb-4 text-neutral-700">{t("packagingIntro")}</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-neutral-700">{t("packagingItem1")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-neutral-700">{t("packagingItem2")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-neutral-700">{t("packagingItem3")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-neutral-700">{t("packagingItem4")}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-900 p-8 text-white">
              <h4 className="mb-4 text-xl font-bold">{t("trackOrderTitle")}</h4>
              <p className="mb-4 text-neutral-300">{t("trackOrderBody")}</p>
              <p className="text-sm text-neutral-400">{t("trackOrderNote")}</p>
            </div>
          </div>
        )}

        {/* Returns Tab */}
        {activeTab === "returns" && (
          <div className="space-y-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-neutral-900">
                {t("returnPolicyTitle")}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-neutral-600">
                {t("returnPolicySubtitle")}
              </p>
            </div>

            <div className="mb-12 rounded-2xl bg-gradient-to-r from-[#B18D0C] to-[#8A6A09] p-8 text-center text-white">
              <h3 className="mb-2 text-3xl font-bold">{t("returnWindowTitle")}</h3>
              <p className="text-xl text-neutral-100">{t("returnWindowBody")}</p>
            </div>

            <div className="mb-12 grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                  <h3 className="text-2xl font-bold text-neutral-900">
                    {t("eligibleForReturn")}
                  </h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-neutral-700">{t("eligibleItem1")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-neutral-700">{t("eligibleItem2")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-neutral-700">{t("eligibleItem3")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-neutral-700">{t("eligibleItem4")}</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-4">
                  <AlertTriangle className="h-10 w-10 text-orange-600" />
                  <h3 className="text-2xl font-bold text-neutral-900">{t("notEligible")}</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-orange-600"></div>
                    <span className="text-neutral-700">{t("notEligibleItem1")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-orange-600"></div>
                    <span className="text-neutral-700">{t("notEligibleItem2")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-orange-600"></div>
                    <span className="text-neutral-700">{t("notEligibleItem3")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-orange-600"></div>
                    <span className="text-neutral-700">{t("notEligibleItem4")}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
              <h3 className="mb-6 text-2xl font-bold text-neutral-900">
                {t("returnProcessTitle")}
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                    1
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-neutral-900">
                      {t("returnStep1Title")}
                    </h4>
                    <p className="text-neutral-700">{t("returnStep1Body", { supportEmail })}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                    2
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-neutral-900">
                      {t("returnStep2Title")}
                    </h4>
                    <p className="text-neutral-700">{t("returnStep2Body")}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                    3
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-neutral-900">
                      {t("returnStep3Title")}
                    </h4>
                    <p className="text-neutral-700">{t("returnStep3Body")}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B18D0C] font-bold text-white">
                    4
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-neutral-900">
                      {t("returnStep4Title")}
                    </h4>
                    <p className="text-neutral-700">{t("returnStep4Body")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-e-xl border-s-4 border-[#B18D0C] bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 p-6">
              <h4 className="mb-2 font-semibold text-neutral-900">{t("damagedTitle")}</h4>
              <p className="text-neutral-700">{t("damagedBody")}</p>
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-16 rounded-2xl border border-neutral-100 bg-white p-8 shadow-lg md:p-12">
          <div className="mb-8 text-center">
            <h3 className="mb-4 text-3xl font-bold text-neutral-900">{t("needHelpTitle")}</h3>
            <p className="text-lg text-neutral-600">{t("needHelpSubtitle")}</p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center justify-center gap-3 rounded-xl bg-[#B18D0C] px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#8A6A09] hover:shadow-xl"
            >
              <Mail className="h-5 w-5" />
              {t("emailSupportButton")}
            </a>
            <a
              href={`tel:${supportPhone.replace(/\s/g, "")}`}
              className="flex items-center justify-center gap-3 rounded-xl bg-neutral-900 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-neutral-800 hover:shadow-xl"
            >
              <Phone className="h-5 w-5" />
              {t("callUsButton")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
