// components/auth/login-form.tsx
"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  User,
  Store,
  ArrowRight,
} from "lucide-react";
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const isSubmitting = isLoading || isRedirecting;
  const router = useRouter();
  const { data: session, update } = useSession();

  useEffect(() => {
    if (session?.user) {
      setIsRedirecting(true);
      router.push(session.user.role === "admin" ? "/admin" : "/");
    }
  }, [session, router]);

  const validateEmail = (v: string) => {
    if (!v) {
      setEmailError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateEmail(email) || !validatePassword(password)) return;
    setIsLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password. Please try again."
            : result.error
        );
        return;
      }
      if (result?.ok) {
        setIsRedirecting(true);
        await update();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-5xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* ── Left: brand panel ── */}
          <div className="hidden flex-col justify-center space-y-8 border-r border-stone-200 pr-8 lg:flex">
            <div className="relative h-28 w-full max-w-[300px]">
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
                Welcome back.
              </h1>
              <p className="text-base leading-relaxed text-stone-500">
                Your favourite local brands are waiting. Sign in to continue your journey.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: "Verified local sellers", sub: "Every vendor is reviewed and approved" },
                { label: "Secure checkout", sub: "Industry-standard encryption on every order" },
                { label: "Easy returns", sub: "7-day hassle-free return policy" },
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
          </div>

          {/* ── Right: form card ── */}
          <div className="mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              {/* Card header */}
              <div className="border-b border-stone-100 px-7 pt-7 pb-5">
                <div className="relative mb-5 h-10 w-32 lg:hidden">
                  <Image
                    src={LinkAndSmileLogo}
                    alt="LinkAndSmile"
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Sign in</h2>
                <p className="mt-0.5 text-sm text-stone-400">
                  Enter your credentials to access your account
                </p>
              </div>

              <div className="px-7 py-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  {/* Global error */}
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-500 uppercase"
                    >
                      <Mail className="h-3.5 w-3.5 text-amber-500" /> Email address
                    </label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) validateEmail(e.target.value);
                        }}
                        onBlur={() => validateEmail(email)}
                        disabled={isSubmitting}
                        className={`h-11 rounded-xl border-2 pr-9 text-sm transition-colors ${
                          emailError
                            ? "border-red-300 bg-red-50 focus:border-red-400"
                            : email && !emailError
                              ? "border-green-300 bg-green-50/30 focus:border-green-400"
                              : "border-stone-200 focus:border-amber-400"
                        }`}
                      />
                      {email && !emailError && (
                        <CheckCircle2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                    {emailError && (
                      <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-500 uppercase"
                    >
                      <Lock className="h-3.5 w-3.5 text-amber-500" /> Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                        }}
                        onBlur={() => validatePassword(password)}
                        disabled={isSubmitting}
                        className={`h-11 rounded-xl border-2 pr-10 text-sm transition-colors ${
                          passwordError
                            ? "border-red-300 bg-red-50 focus:border-red-400"
                            : password && !passwordError
                              ? "border-green-300 bg-green-50/30 focus:border-green-400"
                              : "border-stone-200 focus:border-amber-400"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSubmitting}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Forgot password */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push("/auth/forgot-password")}
                      disabled={isLoading}
                      className="text-xs font-semibold text-amber-600 transition-colors hover:text-amber-700"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 text-sm font-bold text-white transition-all duration-200 hover:bg-amber-500 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-stone-900 disabled:hover:shadow-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isRedirecting ? "Redirecting…" : "Signing in…"}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-100" />
                  <span className="text-xs font-medium text-stone-400">New to LinkAndSmile?</span>
                  <div className="h-px flex-1 bg-stone-100" />
                </div>

                {/* Register links */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/auth/register")}
                    disabled={isLoading}
                    className="group flex items-center justify-center gap-2 rounded-xl border-2 border-stone-200 py-3 text-sm font-semibold text-stone-600 transition-all duration-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  >
                    <User className="h-4 w-4 transition-transform group-hover:scale-110" />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/auth/register-vendor")}
                    disabled={isLoading}
                    className="group flex items-center justify-center gap-2 rounded-xl border-2 border-stone-200 py-3 text-sm font-semibold text-stone-600 transition-all duration-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  >
                    <Store className="h-4 w-4 transition-transform group-hover:scale-110" />
                    Vendor
                  </button>
                </div>
              </div>
            </div>

            {/* Under-card note */}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              Protected by industry-standard encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
