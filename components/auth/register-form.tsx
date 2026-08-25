// components/auth/register-form.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { trackCompleteRegistration } from "@/lib/facebook-pixel";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  Store,
  User,
} from "lucide-react";
import OtpForm from "./otp-form";
import LinkAndSmileLogo from "@/public/linknsmile_newOne.png";

export function RegisterForm() {
  const t = useTranslations("RegisterForm");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  async function onGoogleSignIn() {
    setError("");
    setIsGoogleLoading(true);
    try {
      await signIn("google");
    } catch {
      setError(t("googleSignInFailed"));
      setIsGoogleLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user) router.push("/");
  }, [session, router]);

  const validateName = (v: string) => {
    if (!v.trim()) {
      setNameError(t("nameRequired"));
      return false;
    }
    if (v.trim().length < 2) {
      setNameError(t("nameTooShort"));
      return false;
    }
    setNameError("");
    return true;
  };
  const validateEmail = (v: string) => {
    if (!v.trim()) {
      setEmailError(t("emailRequired"));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
      setEmailError(t("emailInvalid"));
      return false;
    }
    setEmailError("");
    return true;
  };
  const validatePassword = (v: string) => {
    if (!v) {
      setPasswordError(t("passwordRequired"));
      return false;
    }
    if (v.length < 6) {
      setPasswordError(t("passwordTooShort"));
      return false;
    }
    setPasswordError("");
    return true;
  };
  const validateConfirmPassword = (v: string) => {
    if (!v) {
      setConfirmError(t("confirmPasswordRequired"));
      return false;
    }
    if (v !== password) {
      setConfirmError(t("passwordsDontMatch"));
      return false;
    }
    setConfirmError("");
    return true;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (
      !validateName(name) ||
      !validateEmail(email) ||
      !validatePassword(password) ||
      !validateConfirmPassword(confirmPassword)
    )
      return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("registrationFailed"));
        return;
      }
      try {
        trackCompleteRegistration(email, "completed");
      } catch (_) {}
      setShowOtp(true);
    } catch {
      setError(t("genericError"));
    } finally {
      setIsLoading(false);
    }
  }

  // ── OTP step ──
  if (showOtp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-7 pt-7 pb-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">{t("verifyEmailTitle")}</h2>
              <p className="mt-1 text-sm text-stone-400">
                {t.rich("verifyEmailDesc", {
                  email,
                  bold: (chunks) => (
                    <span className="font-semibold text-stone-700">{chunks}</span>
                  ),
                })}
              </p>
            </div>
            <div className="px-7 py-6">
              <OtpForm
                email={email}
                onSuccess={() => router.push("/auth/login?registered=true&verified=true")}
              />
              <p className="mt-5 text-center text-sm text-stone-400">
                {t("alreadyVerified")}{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="font-semibold text-amber-600 transition-colors hover:text-amber-700"
                >
                  {t("signInAction")}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-5xl">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          {/* ── Left: brand panel ── */}
          <div className="hidden flex-col justify-center space-y-8 border-e border-stone-200 pt-4 pe-8 lg:flex">
            <div className="relative h-24 w-full max-w-[280px]">
              <Image
                src={LinkAndSmileLogo}
                alt="LinkAndSmile"
                fill
                className="object-contain object-left"
                priority
              />
            </div>

            <div>
              <h1 className="mb-3 text-4xl leading-tight font-bold text-stone-900">
                {t("joinCommunity")}
              </h1>
              <p className="text-base leading-relaxed text-stone-500">{t("joinCommunityDesc")}</p>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: t("trustSupportLocal"),
                  sub: t("trustSupportLocalDesc"),
                },
                {
                  label: t("trustCuratedQuality"),
                  sub: t("trustCuratedQualityDesc"),
                },
                {
                  label: t("trustTrackOrders"),
                  sub: t("trustTrackOrdersDesc"),
                },
              ].map(({ label, sub }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <CheckCircle2 className="h-3 w-3 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{label}</p>
                    <p className="text-xs text-stone-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Account type chooser hint */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                <User className="mb-2 h-5 w-5 text-amber-500" />
                <p className="mb-0.5 text-xs font-bold text-stone-800">
                  {t("accountTypeCustomer")}
                </p>
                <p className="text-[11px] text-stone-400">{t("accountTypeCustomerDesc")}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                <Store className="mb-2 h-5 w-5 text-amber-500" />
                <p className="mb-0.5 text-xs font-bold text-stone-800">
                  {t("accountTypeVendor")}
                </p>
                <p className="text-[11px] text-stone-400">{t("accountTypeVendorDesc")}</p>
              </div>
            </div>
          </div>

          {/* ── Right: form card ── */}
          <div className="mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-7 pt-7 pb-5">
                <div className="relative mb-5 h-10 w-32 lg:hidden">
                  <Image
                    src={LinkAndSmileLogo}
                    alt="LinkAndSmile"
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <h2 className="text-xl font-bold text-stone-900">{t("createAccount")}</h2>
                <p className="mt-0.5 text-sm text-stone-400">{t("createAccountDesc")}</p>
              </div>

              <div className="px-7 py-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {/* Name */}
                  <FieldWrapper
                    id="name"
                    label={t("fullName")}
                    icon={<UserRound className="h-3.5 w-3.5 text-amber-500" />}
                    error={nameError}
                    hasValue={!!name}
                  >
                    <Input
                      id="name"
                      type="text"
                      placeholder={t("fullNamePlaceholder")}
                      value={name}
                      disabled={isLoading}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) validateName(e.target.value);
                      }}
                      onBlur={() => validateName(name)}
                      className={inputCls(nameError, name && !nameError)}
                    />
                  </FieldWrapper>

                  {/* Email */}
                  <FieldWrapper
                    id="email"
                    label={t("emailAddress")}
                    icon={<Mail className="h-3.5 w-3.5 text-amber-500" />}
                    error={emailError}
                    hasValue={!!email && !emailError}
                  >
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      disabled={isLoading}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) validateEmail(e.target.value);
                      }}
                      onBlur={() => validateEmail(email)}
                      className={inputCls(emailError, email && !emailError)}
                    />
                  </FieldWrapper>

                  {/* Password */}
                  <FieldWrapper
                    id="password"
                    label={t("password")}
                    icon={<Lock className="h-3.5 w-3.5 text-amber-500" />}
                    error={passwordError}
                    hasValue={!!password && !passwordError}
                  >
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("passwordPlaceholder")}
                        value={password}
                        disabled={isLoading}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                          if (confirmPassword) validateConfirmPassword(confirmPassword);
                        }}
                        onBlur={() => validatePassword(password)}
                        className={`pe-10 ${inputCls(passwordError, password && !passwordError)}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        className="absolute top-1/2 end-3 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FieldWrapper>

                  {/* Confirm password */}
                  <FieldWrapper
                    id="confirmPassword"
                    label={t("confirmPassword")}
                    icon={<Lock className="h-3.5 w-3.5 text-amber-500" />}
                    error={confirmError}
                    hasValue={!!confirmPassword && !confirmError}
                  >
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t("confirmPasswordPlaceholder")}
                        value={confirmPassword}
                        disabled={isLoading}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (confirmError) validateConfirmPassword(e.target.value);
                        }}
                        onBlur={() => validateConfirmPassword(confirmPassword)}
                        className={`pe-10 ${inputCls(confirmError, confirmPassword && !confirmError)}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                        className="absolute top-1/2 end-3 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FieldWrapper>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 text-sm font-bold text-white transition-all duration-200 hover:bg-amber-500 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("creatingAccount")}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        {t("createAccountButton")}
                      </>
                    )}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-100" />
                  <span className="text-xs font-medium text-stone-400">{t("or")}</span>
                  <div className="h-px flex-1 bg-stone-100" />
                </div>
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-stone-200 text-sm font-semibold text-stone-700 transition-all duration-200 hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGoogleLoading ? (
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
                  {isGoogleLoading ? t("redirecting") : t("continueWithGoogle")}
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-100" />
                  <span className="text-xs font-medium text-stone-400">{t("alreadyMember")}</span>
                  <div className="h-px flex-1 bg-stone-100" />
                </div>

                <p className="text-center text-sm text-stone-500">
                  {t("alreadyHaveAccount")}{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/login")}
                    disabled={isLoading}
                    className="font-bold text-amber-600 transition-colors hover:text-amber-700"
                  >
                    {t("signInLink")}
                  </button>
                </p>

                <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
                  {t("sellingProducts")}{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/register-vendor")}
                    disabled={isLoading}
                    className="font-semibold text-amber-600 hover:underline"
                  >
                    {t("registerAsVendor")}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function inputCls(hasError: string, isValid: boolean | string) {
  return `h-11 rounded-xl border-2 text-sm transition-colors ${
    hasError
      ? "border-red-300 bg-red-50 focus:border-red-400"
      : isValid
        ? "border-green-300 bg-green-50/30 focus:border-green-400"
        : "border-stone-200 focus:border-amber-400"
  }`;
}

function FieldWrapper({
  id,
  label,
  icon,
  error,
  hasValue,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error: string;
  hasValue: boolean | string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-500 uppercase"
      >
        {icon} {label}
      </label>
      <div className="relative">
        {children}
        {hasValue && !error && (
          <CheckCircle2 className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-green-500" />
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
