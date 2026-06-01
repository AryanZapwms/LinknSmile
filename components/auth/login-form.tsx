// components/auth/login-form.tsx
"use client"

import React, { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2,
  Loader2, ShieldCheck, User, Store, ArrowRight,
} from "lucide-react"
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const isSubmitting = isLoading || isRedirecting
  const router = useRouter()
  const { data: session, update } = useSession()

  useEffect(() => {
    if (session?.user) {
      setIsRedirecting(true)
      router.push(session.user.role === "admin" ? "/admin" : "/")
    }
  }, [session, router])

  const validateEmail = (v: string) => {
    if (!v) { setEmailError("Email is required"); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setEmailError("Enter a valid email address"); return false }
    setEmailError(""); return true
  }
  const validatePassword = (v: string) => {
    if (!v) { setPasswordError("Password is required"); return false }
    if (v.length < 6) { setPasswordError("Password must be at least 6 characters"); return false }
    setPasswordError(""); return true
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!validateEmail(email) || !validatePassword(password)) return
    setIsLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password. Please try again." : result.error)
        return
      }
      if (result?.ok) { setIsRedirecting(true); await update() }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-10 items-center">

          {/* ── Left: brand panel ── */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 pr-8 border-r border-stone-200">
            <div className="relative w-full max-w-[300px] h-28">
              <Image src={LinkAndSmileLogo} alt="LinkAndSmile" fill className="object-contain object-left" priority />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-stone-900 leading-tight mb-3">
                Welcome back.
              </h1>
              <p className="text-stone-500 text-base leading-relaxed">
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
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-amber-600" />
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
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="px-7 pt-7 pb-5 border-b border-stone-100">
                <div className="lg:hidden mb-5 relative w-32 h-10">
                  <Image src={LinkAndSmileLogo} alt="LinkAndSmile" fill className="object-contain object-left" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Sign in</h2>
                <p className="text-sm text-stone-400 mt-0.5">Enter your credentials to access your account</p>
              </div>

              <div className="px-7 py-6">
                <form onSubmit={onSubmit} className="space-y-4">

                  {/* Global error */}
                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-3.5 py-3">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-500" /> Email address
                    </label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value) }}
                        onBlur={() => validateEmail(email)}
                        disabled={isSubmitting}
                        className={`h-11 rounded-xl border-2 text-sm transition-colors pr-9 ${
                          emailError ? "border-red-300 bg-red-50 focus:border-red-400"
                          : email && !emailError ? "border-green-300 bg-green-50/30 focus:border-green-400"
                          : "border-stone-200 focus:border-amber-400"
                        }`}
                      />
                      {email && !emailError && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                      )}
                    </div>
                    {emailError && (
                      <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />{emailError}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500" /> Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (passwordError) validatePassword(e.target.value) }}
                        onBlur={() => validatePassword(password)}
                        disabled={isSubmitting}
                        className={`h-11 rounded-xl border-2 text-sm transition-colors pr-10 ${
                          passwordError ? "border-red-300 bg-red-50 focus:border-red-400"
                          : password && !passwordError ? "border-green-300 bg-green-50/30 focus:border-green-400"
                          : "border-stone-200 focus:border-amber-400"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSubmitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />{passwordError}
                      </p>
                    )}
                  </div>

                  {/* Forgot password */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push("/auth/forgot-password")}
                      disabled={isLoading}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-stone-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-500 hover:shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-stone-900 disabled:hover:shadow-none"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{isRedirecting ? "Redirecting…" : "Signing in…"}</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" />Sign In</>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-stone-100" />
                  <span className="text-xs text-stone-400 font-medium">New to LinkAndSmile?</span>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>

                {/* Register links */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/auth/register")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 border-2 border-stone-200 rounded-xl py-3 text-sm font-semibold text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-all duration-200 group"
                  >
                    <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/auth/register-vendor")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 border-2 border-stone-200 rounded-xl py-3 text-sm font-semibold text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-all duration-200 group"
                  >
                    <Store className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Vendor
                  </button>
                </div>
              </div>
            </div>

            {/* Under-card note */}
            <p className="text-center text-xs text-stone-400 mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              Protected by industry-standard encryption
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}