

"use client"

import React, { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react"
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

      if (session.user.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/")
      }
    }
  }, [session, router])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError("Email is required")
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address")
      return false
    }
    setEmailError("")
    return true
  }

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("Password is required")
      return false
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return false
    }
    setPasswordError("")
    return true
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please try again.")
        } else {
          setError(result.error)
        }
        return
      }

      if (result?.ok) {
        setIsRedirecting(true)
        await update()
        return
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary-soft/50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl animate-slide-up">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Welcome Section */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 px-8">
            <div className="space-y-6">
              <h1 className="text-5xl font-bold leading-tight text-gradient">
                Welcome Back to
              </h1>
              
              <div className="flex items-center gap-4">
                <div className="relative w-full max-w-[400px] h-40 rounded-2xl overflow-hidden shadow-glow  ring-primary-500/20">
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
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Your journey to radiant skin continues here. Sign in to access exclusive products and personalized recommendations.
                </p>
              </div>

              {/* Features with premium styling */}
              <div className="space-y-4 pt-4">
                {[
                  { icon: Sparkles, title: "Premium Products", desc: "Access to exclusive skincare collections" },
                  { icon: ShieldCheck, title: "Secure & Safe", desc: "Your data protected with encryption" },
                  { icon: CheckCircle2, title: "Expert Guidance", desc: "Personalized skincare recommendations" }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary-soft flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-gradient-primary-subtle transition-all duration-300">
                      <feature.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="border border-primary-500/10 shadow-xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl rounded-2xl overflow-hidden">
              
              <CardHeader className="space-y-2  pb-6 bg-gradient-primary-soft/70 dark:bg-primary-500/5 border-b border-primary-500/10">
                <CardTitle className="text-2xl font-bold text-gradient">
                  Sign In
                </CardTitle>
                <CardDescription className="text-muted-foreground text-base">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6">
                <form onSubmit={onSubmit} className="space-y-5">
                  
                  {/* Error Alert */}
                  {error && (
                    <Alert 
                      variant="destructive" 
                      className="bg-error-50/90 dark:bg-error-500/10 border-2 border-error-200 dark:border-error-500/20 animate-scale-in"
                    >
                      <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400" />
                      <AlertDescription className="ml-2 text-error-700 dark:text-error-300 font-medium whitespace-pre-wrap">
                        {typeof error === "string" ? error : JSON.stringify(error)}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="email" 
                      className="text-sm font-semibold text-foreground/80 flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4 text-primary-500 dark:text-primary-400" />
                      Email Address
                    </label>

                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (emailError) validateEmail(e.target.value)
                        }}
                        onBlur={() => validateEmail(email)}
                        className={`pl-4 pr-10 h-12 text-base border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 ${
                          emailError 
                            ? "border-error-400 dark:border-error-600 focus:border-error-500 bg-error-50/50 dark:bg-error-500/5" 
                            : email && !emailError 
                            ? "border-success-400 dark:border-success-600 focus:border-success-500 bg-success-50/50 dark:bg-success-500/5"
                            : "border-input hover:border-primary-400 dark:hover:border-primary-500 focus:border-primary-500"
                        }`}
                        disabled={isSubmitting}
                      />

                      {email && !emailError && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-success-600 dark:text-success-400 animate-scale-in" />
                      )}
                    </div>

                    {emailError && (
                      <p className="text-sm text-error-600 dark:text-error-400 flex items-center gap-1 font-medium animate-slide-up">
                        <AlertCircle className="h-4 w-4" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="password" 
                      className="text-sm font-semibold text-foreground/80 flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4 text-primary-500 dark:text-primary-400" />
                      Password
                    </label>

                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (passwordError) validatePassword(e.target.value)
                        }}
                        onBlur={() => validatePassword(password)}
                        className={`pl-4 pr-12 h-12 text-base border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 ${
                          passwordError 
                            ? "border-error-400 dark:border-error-600 focus:border-error-500 bg-error-50/50 dark:bg-error-500/5" 
                            : password && !passwordError 
                            ? "border-success-400 dark:border-success-600 focus:border-success-500 bg-success-50/50 dark:bg-success-500/5"
                            : "border-input hover:border-primary-400 dark:hover:border-primary-500 focus:border-primary-500"
                        }`}
                        disabled={isSubmitting}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-1 rounded-md hover:bg-gradient-primary-soft"
                        disabled={isSubmitting}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {passwordError && (
                      <p className="text-sm text-error-600 dark:text-error-400 flex items-center gap-1 font-medium animate-slide-up">
                        <AlertCircle className="h-4 w-4" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Forgot Password */}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => router.push("/auth/forgot-password")}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold hover:underline transition-all duration-200"
                      disabled={isLoading}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button - Premium Gradient */}
                  <Button 
                    type="submit" 
                    className="w-full h-12 border border-primary-500/10 bg-purple-500 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]  hover:text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isRedirecting ? "Redirecting..." : "Signing in..."}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Sign In
                      </>
                    )}
                  </Button>

                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-card text-muted-foreground font-medium">
                      New to LinkNSmile?
                    </span>
                  </div>
                </div>

                {/* Register Links */}
                <div className="text-center space-y-3">
                  <p className="text-base text-muted-foreground">
                    Create a customer account?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/auth/register")}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold hover:underline transition-colors duration-300 inline-flex items-center gap-1"
                      disabled={isLoading}
                    >
                      Create one now →
                    </button>
                  </p>

                  <p className="text-base text-muted-foreground">
                    Create a vendor account?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/auth/register-vendor")}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold hover:underline transition-colors duration-300 inline-flex items-center gap-1"
                      disabled={isLoading}
                    >
                      Create one now →
                    </button>
                  </p>
                </div>

                {/* Security Note */}
                <div className="lg:hidden mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary-500" />
                    <span>Protected by industry-standard encryption</span>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}