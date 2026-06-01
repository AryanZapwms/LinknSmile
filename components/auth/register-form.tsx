// components/auth/register-form.tsx
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { trackCompleteRegistration } from "@/lib/facebook-pixel"
import {
  AlertCircle, CheckCircle2, Eye, EyeOff, Loader2,
  Lock, Mail, ShieldCheck, UserRound, Store, User,
} from "lucide-react"
import OtpForm from "./otp-form"
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [nameError, setNameError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmError, setConfirmError] = useState("")
  const [showOtp, setShowOtp] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => { if (session?.user) router.push("/") }, [session, router])

  const validateName = (v: string) => {
    if (!v.trim()) { setNameError("Name is required"); return false }
    if (v.trim().length < 2) { setNameError("Enter your full name"); return false }
    setNameError(""); return true
  }
  const validateEmail = (v: string) => {
    if (!v.trim()) { setEmailError("Email is required"); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) { setEmailError("Enter a valid email address"); return false }
    setEmailError(""); return true
  }
  const validatePassword = (v: string) => {
    if (!v) { setPasswordError("Password is required"); return false }
    if (v.length < 6) { setPasswordError("Password must be at least 6 characters"); return false }
    setPasswordError(""); return true
  }
  const validateConfirmPassword = (v: string) => {
    if (!v) { setConfirmError("Please confirm your password"); return false }
    if (v !== password) { setConfirmError("Passwords do not match"); return false }
    setConfirmError(""); return true
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!validateName(name) || !validateEmail(email) || !validatePassword(password) || !validateConfirmPassword(confirmPassword)) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Registration failed"); return }
      try { trackCompleteRegistration(email, "completed") } catch (_) {}
      setShowOtp(true)
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── OTP step ──
  if (showOtp) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-7 pt-7 pb-5 border-b border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">Verify your email</h2>
              <p className="text-sm text-stone-400 mt-1">
                Enter the code we sent to <span className="font-semibold text-stone-700">{email}</span>
              </p>
            </div>
            <div className="px-7 py-6">
              <OtpForm email={email} onSuccess={() => router.push("/auth/login?registered=true&verified=true")} />
              <p className="text-center text-sm text-stone-400 mt-5">
                Already verified?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="text-amber-600 font-semibold hover:text-amber-700 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Registration form ──
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* ── Left: brand panel ── */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 pr-8 border-r border-stone-200 pt-4">
            <div className="relative w-full max-w-[280px] h-24">
              <Image src={LinkAndSmileLogo} alt="LinkAndSmile" fill className="object-contain object-left" priority />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-stone-900 leading-tight mb-3">
                Join our community.
              </h1>
              <p className="text-stone-500 text-base leading-relaxed">
                Discover local brands, artisan products, and sellers you can trust — all in one place.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: "Support local sellers", sub: "Every purchase empowers an Indian small business" },
                { label: "Curated quality", sub: "Products reviewed before they go live on the platform" },
                { label: "Track every order", sub: "Full order history and easy returns in your account" },
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

            {/* Account type chooser hint */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <User className="w-5 h-5 text-amber-500 mb-2" />
                <p className="text-xs font-bold text-stone-800 mb-0.5">Customer</p>
                <p className="text-[11px] text-stone-400">Shop from local brands</p>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <Store className="w-5 h-5 text-amber-500 mb-2" />
                <p className="text-xs font-bold text-stone-800 mb-0.5">Vendor</p>
                <p className="text-[11px] text-stone-400">Sell your products</p>
              </div>
            </div>
          </div>

          {/* ── Right: form card ── */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

              <div className="px-7 pt-7 pb-5 border-b border-stone-100">
                <div className="lg:hidden mb-5 relative w-32 h-10">
                  <Image src={LinkAndSmileLogo} alt="LinkAndSmile" fill className="object-contain object-left" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Create account</h2>
                <p className="text-sm text-stone-400 mt-0.5">Fill in your details to get started</p>
              </div>

              <div className="px-7 py-6">
                <form onSubmit={onSubmit} className="space-y-4">

                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-3.5 py-3">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {/* Name */}
                  <FieldWrapper
                    id="name" label="Full name" icon={<UserRound className="w-3.5 h-3.5 text-amber-500" />}
                    error={nameError}
                    hasValue={!!name}
                  >
                    <Input
                      id="name" type="text" placeholder="Your full name"
                      value={name} disabled={isLoading}
                      onChange={(e) => { setName(e.target.value); if (nameError) validateName(e.target.value) }}
                      onBlur={() => validateName(name)}
                      className={inputCls(nameError, name && !nameError)}
                    />
                  </FieldWrapper>

                  {/* Email */}
                  <FieldWrapper
                    id="email" label="Email address" icon={<Mail className="w-3.5 h-3.5 text-amber-500" />}
                    error={emailError} hasValue={!!email && !emailError}
                  >
                    <Input
                      id="email" type="email" placeholder="you@example.com"
                      value={email} disabled={isLoading}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value) }}
                      onBlur={() => validateEmail(email)}
                      className={inputCls(emailError, email && !emailError)}
                    />
                  </FieldWrapper>

                  {/* Password */}
                  <FieldWrapper
                    id="password" label="Password" icon={<Lock className="w-3.5 h-3.5 text-amber-500" />}
                    error={passwordError} hasValue={!!password && !passwordError}
                  >
                    <div className="relative">
                      <Input
                        id="password" type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={password} disabled={isLoading}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (passwordError) validatePassword(e.target.value)
                          if (confirmPassword) validateConfirmPassword(confirmPassword)
                        }}
                        onBlur={() => validatePassword(password)}
                        className={`pr-10 ${inputCls(passwordError, password && !passwordError)}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FieldWrapper>

                  {/* Confirm password */}
                  <FieldWrapper
                    id="confirmPassword" label="Confirm password" icon={<Lock className="w-3.5 h-3.5 text-amber-500" />}
                    error={confirmError} hasValue={!!confirmPassword && !confirmError}
                  >
                    <div className="relative">
                      <Input
                        id="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={confirmPassword} disabled={isLoading}
                        onChange={(e) => { setConfirmPassword(e.target.value); if (confirmError) validateConfirmPassword(e.target.value) }}
                        onBlur={() => validateConfirmPassword(confirmPassword)}
                        className={`pr-10 ${inputCls(confirmError, confirmPassword && !confirmError)}`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FieldWrapper>

                  {/* Submit */}
                  <button
                    type="submit" disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-stone-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-500 hover:shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" />Create Account</>
                    )}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-stone-100" />
                  <span className="text-xs text-stone-400 font-medium">Already a member?</span>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>

                <p className="text-center text-sm text-stone-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/login")}
                    disabled={isLoading}
                    className="text-amber-600 font-bold hover:text-amber-700 transition-colors"
                  >
                    Sign in →
                  </button>
                </p>

                <p className="text-center text-xs text-stone-400 mt-4 flex items-center justify-center gap-1.5">
                  Selling products?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/register-vendor")}
                    disabled={isLoading}
                    className="text-amber-600 font-semibold hover:underline"
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
  )
}

/* ── Helpers ── */
function inputCls(hasError: string, isValid: boolean | string) {
  return `h-11 rounded-xl border-2 text-sm transition-colors ${
    hasError ? "border-red-300 bg-red-50 focus:border-red-400"
    : isValid ? "border-green-300 bg-green-50/30 focus:border-green-400"
    : "border-stone-200 focus:border-amber-400"
  }`
}

function FieldWrapper({
  id, label, icon, error, hasValue, children,
}: {
  id: string
  label: string
  icon: React.ReactNode
  error: string
  hasValue: boolean | string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon} {label}
      </label>
      <div className="relative">
        {children}
        {hasValue && !error && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
    </div>
  )
}