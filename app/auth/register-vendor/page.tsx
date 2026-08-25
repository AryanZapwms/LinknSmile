"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Store,
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Sparkles,
  Building2,
  FileText,
} from "lucide-react";
import Image from "next/image";
import LinkAndSmileLogo from "@/public/linknsmile_newOne.png";

export default function RegisterVendorPage() {
  const t = useTranslations("RegisterVendorPage");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/vendor-apply" });
    } catch {
      setError(t("googleSignInFailed"));
      setGoogleLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    shopName: "",
    description: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.phone) {
        setError(t("fillPersonalFields"));
        return;
      }
    }
    if (step === 2) {
      if (
        !formData.shopName ||
        !formData.street ||
        !formData.city ||
        !formData.state ||
        !formData.pincode
      ) {
        setError(t("fillShopFields"));
        return;
      }
    }
    setError("");
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError(t("passwordsDontMatch"));
      return;
    }

    if (formData.password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || t("registrationFailed"));
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/auth/verify-otp?email=${formData.email}`);
      }, 2000);
    } catch (err) {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-primary-soft/50 flex min-h-screen items-center justify-center p-4 dark:bg-neutral-900">
        <Card className="border-primary-500/10 animate-scale-in w-full max-w-md overflow-hidden rounded-2xl border bg-white/90 shadow-xl backdrop-blur-xl dark:bg-neutral-800/90">
          <CardContent className="space-y-6 pt-12 pb-12 text-center">
            <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-gradient text-3xl font-bold">{t("applicationReceived")}</h2>
              <p className="text-muted-foreground text-lg">{t("redirectingVerify")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-primary-soft/50 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 dark:bg-neutral-900">
      <div className="animate-slide-up w-full max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Side: Brand & Benefits */}
          <div className="hidden flex-col space-y-10 px-8 lg:flex">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="shadow-glow ring-primary-500/20 relative h-40 w-full max-w-[400px] overflow-hidden rounded-2xl">
                  <Image
                    src={LinkAndSmileLogo}
                    alt="LinkAndSmile Logo"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-gradient text-5xl leading-tight font-bold">
                  {t("growBusiness")}
                </h1>
                <h2 className="text-foreground text-3xl font-bold">{t("asVendor")}</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">{t("heroDesc")}</p>
              </div>

              <div className="grid gap-6">
                {[
                  {
                    icon: Building2,
                    title: t("marketGrowth"),
                    desc: t("marketGrowthDesc"),
                  },
                  {
                    icon: ShieldCheck,
                    title: t("qualityPartners"),
                    desc: t("qualityPartnersDesc"),
                  },
                  {
                    icon: Sparkles,
                    title: t("premiumSupport"),
                    desc: t("premiumSupportDesc"),
                  },
                ].map((item, i) => (
                  <div key={i} className="group flex items-start gap-4">
                    <div className="bg-gradient-primary-soft flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
                      <item.icon className="text-primary-600 h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-foreground text-lg font-bold">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Step Form */}
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            <Card className="border-primary-500/10 overflow-hidden rounded-2xl border bg-white/90 shadow-xl backdrop-blur-xl dark:bg-neutral-800/90">
              <CardHeader className="bg-gradient-primary-soft/70 dark:bg-primary-500/5 border-primary-500/10 space-y-4 border-b pb-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-gradient text-2xl font-bold">
                      {t("vendorApplication")}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">
                      {t("stepOf", {
                        step,
                        stepName:
                          step === 1
                            ? t("stepPersonalInfo")
                            : step === 2
                              ? t("stepShopDetails")
                              : t("stepSecurity"),
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-2.5 w-12 rounded-full transition-all duration-300 ${
                          s <= step
                            ? "bg-primary-500 shadow-glow"
                            : "bg-neutral-200 dark:bg-neutral-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert
                      variant="destructive"
                      className="bg-error-50/90 dark:bg-error-500/10 border-error-200 animate-scale-in border-2"
                    >
                      <AlertCircle className="h-5 w-5" />
                      <AlertDescription className="ms-2 font-medium whitespace-pre-wrap">
                        {typeof error === "string" ? error : JSON.stringify(error)}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="min-h-[400px]">
                    {step === 1 && (
                      <div className="animate-in fade-in slide-in-from-right-4 space-y-5 duration-300">
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={googleLoading || loading}
                          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-stone-200 text-sm font-semibold text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {googleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.92H1.3v3.11C3.27 21.3 7.31 24 12 24z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.31 14.31a7.2 7.2 0 0 1 0-4.62V6.58H1.3a12 12 0 0 0 0 10.84l4.01-3.11z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.27 2.7 1.3 6.58l4.01 3.11C6.25 6.85 8.89 4.75 12 4.75z"
                              />
                            </svg>
                          )}
                          {googleLoading ? t("redirecting") : t("continueWithGoogle")}
                        </button>
                        <p className="text-center text-xs text-stone-400">{t("googleHint")}</p>
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-stone-100" />
                          <span className="text-xs font-medium text-stone-400">
                            {t("orFillManually")}
                          </span>
                          <div className="h-px flex-1 bg-stone-100" />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="name"
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <User className="text-primary-500 h-4 w-4" /> {t("fullName")}
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder={t("fullNamePlaceholder")}
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="focus:ring-primary-500/20 h-12 rounded-xl border-2 focus:ring-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <Mail className="text-primary-500 h-4 w-4" /> {t("emailAddress")}
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder={t("emailPlaceholder")}
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="focus:ring-primary-500/20 h-12 rounded-xl border-2 focus:ring-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="phone"
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <Phone className="text-primary-500 h-4 w-4" /> {t("phoneNumber")}
                          </Label>
                          <Input
                            id="phone"
                            name="phone"
                            placeholder={t("phoneNumberPlaceholder")}
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            dir="ltr"
                            className="focus:ring-primary-500/20 h-12 rounded-xl border-2 focus:ring-2"
                          />
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="animate-in fade-in slide-in-from-right-4 space-y-4 duration-300">
                        <div className="space-y-2">
                          <Label
                            htmlFor="shopName"
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <Store className="text-primary-500 h-4 w-4" /> {t("shopName")}
                          </Label>
                          <Input
                            id="shopName"
                            name="shopName"
                            placeholder={t("shopNamePlaceholder")}
                            value={formData.shopName}
                            onChange={handleChange}
                            required
                            className="focus:ring-primary-500/20 h-11 rounded-xl border-2 focus:ring-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="street"
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <MapPin className="text-primary-500 h-4 w-4" /> {t("streetAddress")}
                          </Label>
                          <Input
                            id="street"
                            name="street"
                            placeholder={t("streetAddressPlaceholder")}
                            value={formData.street}
                            onChange={handleChange}
                            required
                            className="focus:ring-primary-500/20 h-11 rounded-xl border-2 focus:ring-2"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city" className="text-sm font-bold">
                              {t("city")}
                            </Label>
                            <Input
                              id="city"
                              name="city"
                              placeholder={t("cityPlaceholder")}
                              value={formData.city}
                              onChange={handleChange}
                              required
                              className="focus:ring-primary-500/20 h-11 rounded-xl border-2 focus:ring-2"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state" className="text-sm font-bold">
                              {t("state")}
                            </Label>
                            <Input
                              id="state"
                              name="state"
                              placeholder={t("statePlaceholder")}
                              value={formData.state}
                              onChange={handleChange}
                              required
                              className="focus:ring-primary-500/20 h-11 rounded-xl border-2 focus:ring-2"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pincode" className="text-sm font-bold">
                            {t("pincode")}
                          </Label>
                          <Input
                            id="pincode"
                            name="pincode"
                            placeholder={t("pincodePlaceholder")}
                            value={formData.pincode}
                            onChange={handleChange}
                            required
                            className="focus:ring-primary-500/20 h-11 rounded-xl border-2 focus:ring-2"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="gstNumber"
                              className="flex items-center gap-2 text-sm font-bold"
                            >
                              <FileText className="h-3 w-3" /> {t("gstLabel")}
                            </Label>
                            <Input
                              id="gstNumber"
                              name="gstNumber"
                              placeholder={t("gstPlaceholder")}
                              value={formData.gstNumber}
                              onChange={handleChange}
                              className="focus:ring-primary-500/20 h-11 rounded-xl border-2 focus:ring-2"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="panNumber"
                              className="flex items-center gap-2 text-sm font-bold"
                            >
                              <FileText className="h-3 w-3" /> {t("panLabel")}
                            </Label>
                            <Input
                              id="panNumber"
                              name="panNumber"
                              placeholder={t("panPlaceholder")}
                              value={formData.panNumber}
                              onChange={handleChange}
                              className="focus:ring-primary-500/20 h-11 rounded-xl border-2 focus:ring-2"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="animate-in fade-in slide-in-from-right-4 space-y-5 duration-300">
                        <div className="space-y-2">
                          <Label
                            htmlFor="password"
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <Lock className="text-primary-500 h-4 w-4" /> {t("passwordLabel")}
                          </Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="focus:ring-primary-500/20 h-12 rounded-xl border-2 focus:ring-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="confirmPassword"
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <Lock className="text-primary-500 h-4 w-4" />{" "}
                            {t("confirmPasswordLabel")}
                          </Label>
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className="focus:ring-primary-500/20 h-12 rounded-xl border-2 focus:ring-2"
                          />
                        </div>
                        <div className="bg-primary-50/50 border-primary-100 text-primary-700 rounded-xl border p-4 pt-4 text-sm italic">
                          {t("termsNotice")}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-border flex gap-4 border-t pt-4">
                    {step > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="h-12 flex-1 rounded-xl border-2 font-bold"
                      >
                        <ChevronLeft className="me-2 h-5 w-5 rtl:rotate-180" /> {t("back")}
                      </Button>
                    )}
                    {step < 3 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="hover:shadow-glow h-12 flex-1 rounded-xl bg-purple-500 font-bold text-white transition-all hover:bg-purple-600"
                      >
                        {t("continueBtn")} <ChevronRight className="ms-2 h-5 w-5 rtl:rotate-180" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading}
                        className="hover:shadow-glow h-12 flex-1 rounded-xl bg-purple-600 font-bold text-white transition-all hover:bg-purple-700"
                      >
                        {loading ? (
                          <Loader2 className="me-2 h-5 w-5 animate-spin" />
                        ) : (
                          <ShieldCheck className="me-2 h-5 w-5" />
                        )}
                        {loading ? t("registering") : t("submitApplication")}
                      </Button>
                    )}
                  </div>
                </form>

                <div className="mt-8 space-y-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    {t("alreadyVendor")}{" "}
                    <Link href="/auth/login" className="text-primary-600 font-bold hover:underline">
                      {t("loginHere")}
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
