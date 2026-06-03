// components/auth/register-form.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png";

export function RegisterForm() {
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
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) router.push("/");
  }, [session, router]);

  const validateName = (v: string) => {
    if (!v.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (v.trim().length < 2) {
      setNameError("Enter your full name");
      return false;
    }
    setNameError("");
    return true;
  };
  const validateEmail = (v: string) => {
    if (!v.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
      setEmailError("Enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };
  const validatePassword = (v: string) => {
    if (!v) {
      setPasswordError("Password is required");
      return false;
    }
    if (v.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };
  const validateConfirmPassword = (v: string) => {
    if (!v) {
      setConfirmError("Please confirm your password");
      return false;
    }
    if (v !== password) {
      setConfirmError("Passwords do not match");
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
        setError(data.error || "Registration failed");
        return;
      }
      try {
        trackCompleteRegistration(email, "completed");
      } catch (_) {}
      setShowOtp(true);
    } catch {
      setError("An error occurred. Please try again.");
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
              <h2 className="text-xl font-bold text-stone-900">Verify your email</h2>
              <p className="mt-1 text-sm text-stone-400">
                Enter the code we sent to{" "}
                <span className="font-semibold text-stone-700">{email}</span>
              </p>
            </div>
            <div className="px-7 py-6">
              <OtpForm
                email={email}
                onSuccess={() => router.push("/auth/login?registered=true&verified=true")}
              />
              <p className="mt-5 text-center text-sm text-stone-400">
                Already verified?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="font-semibold text-amber-600 transition-colors hover:text-amber-700"
                >
                  Sign in
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
          <div className="hidden flex-col justify-center space-y-8 border-r border-stone-200 pt-4 pr-8 lg:flex">
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
                Join our community.
              </h1>
              <p className="text-base leading-relaxed text-stone-500">
                Discover local brands, artisan products, and sellers you can trust — all in one
                place.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: "Support local sellers",
                  sub: "Every purchase empowers an Indian small business",
                },
                {
                  label: "Curated quality",
                  sub: "Products reviewed before they go live on the platform",
                },
                {
                  label: "Track every order",
                  sub: "Full order history and easy returns in your account",
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
                <p className="mb-0.5 text-xs font-bold text-stone-800">Customer</p>
                <p className="text-[11px] text-stone-400">Shop from local brands</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                <Store className="mb-2 h-5 w-5 text-amber-500" />
                <p className="mb-0.5 text-xs font-bold text-stone-800">Vendor</p>
                <p className="text-[11px] text-stone-400">Sell your products</p>
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
                <h2 className="text-xl font-bold text-stone-900">Create account</h2>
                <p className="mt-0.5 text-sm text-stone-400">Fill in your details to get started</p>
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
                    label="Full name"
                    icon={<UserRound className="h-3.5 w-3.5 text-amber-500" />}
                    error={nameError}
                    hasValue={!!name}
                  >
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
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
                    label="Email address"
                    icon={<Mail className="h-3.5 w-3.5 text-amber-500" />}
                    error={emailError}
                    hasValue={!!email && !emailError}
                  >
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
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
                    label="Password"
                    icon={<Lock className="h-3.5 w-3.5 text-amber-500" />}
                    error={passwordError}
                    hasValue={!!password && !passwordError}
                  >
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={password}
                        disabled={isLoading}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                          if (confirmPassword) validateConfirmPassword(confirmPassword);
                        }}
                        onBlur={() => validatePassword(password)}
                        className={`pr-10 ${inputCls(passwordError, password && !passwordError)}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
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
                    label="Confirm password"
                    icon={<Lock className="h-3.5 w-3.5 text-amber-500" />}
                    error={confirmError}
                    hasValue={!!confirmPassword && !confirmError}
                  >
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        disabled={isLoading}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (confirmError) validateConfirmPassword(e.target.value);
                        }}
                        onBlur={() => validateConfirmPassword(confirmPassword)}
                        className={`pr-10 ${inputCls(confirmError, confirmPassword && !confirmError)}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
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
                        Creating account…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Create Account
                      </>
                    )}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-100" />
                  <span className="text-xs font-medium text-stone-400">Already a member?</span>
                  <div className="h-px flex-1 bg-stone-100" />
                </div>

                <p className="text-center text-sm text-stone-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/login")}
                    disabled={isLoading}
                    className="font-bold text-amber-600 transition-colors hover:text-amber-700"
                  >
                    Sign in →
                  </button>
                </p>

                <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
                  Selling products?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/register-vendor")}
                    disabled={isLoading}
                    className="font-semibold text-amber-600 hover:underline"
                  >
                    Register as a vendor
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
