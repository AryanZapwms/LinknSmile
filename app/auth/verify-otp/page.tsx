"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png"

function VerifyOtpContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const isReset = searchParams.get("reset") === "true"
  
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!email) {
      router.push("/auth/login")
    }
  }, [email, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code")
      return
    }

    setIsLoading(true)
    try {
      const endpoint = isReset ? "/api/auth/verify-reset-otp" : "/api/auth/verify-otp"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.trim() }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || data.message || "Verification failed")
      }
      
      setSuccess("Account verified successfully!")
      
      setTimeout(() => {
        if (isReset) {
          router.push(`/auth/reset-password?email=${email}&otp=${otp}`)
        } else {
          router.push("/auth/login?registered=true&verified=true")
        }
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary-soft/50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg animate-scale-in">
        <Card className="border border-primary-500/10 shadow-xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl rounded-2xl overflow-hidden">
          <CardHeader className="space-y-4 pb-8 bg-gradient-primary-soft/70 dark:bg-primary-500/5 border-b border-primary-500/10 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative w-40 h-16">
                <Image src={LinkAndSmileLogo} alt="LinkAndSmile" fill className="object-contain" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gradient">Verify Your Identity</CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              We've sent a 6-digit verification code to
              <div className="font-bold text-foreground mt-1 flex items-center justify-center gap-1">
                <Mail className="w-4 h-4 text-primary-500" /> {email}
              </div>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8 px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-error-50 border-2 border-error-100 animate-slide-up">
                  <AlertCircle className="h-5 w-5 text-error-600" />
                  <AlertDescription className="ml-2 text-error-700 font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="bg-success-50 border-2 border-success-100 animate-slide-up">
                  <CheckCircle2 className="h-5 w-5 text-success-600" />
                  <AlertDescription className="ml-2 text-success-700 font-medium">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="flex justify-center">
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="0 0 0 0 0 0"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    className="h-16 text-center text-3xl tracking-[0.5em] font-bold border-2 rounded-2xl focus:ring-4 focus:ring-primary-500/10 transition-all border-neutral-200"
                    disabled={isLoading || success !== ""}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Didn't receive the code?{" "}
                  <button type="button" className="text-primary-600 font-bold hover:underline">
                    Resend Code
                  </button>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 shadow-glow rounded-xl transition-all"
                disabled={isLoading || success !== "" || otp.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2 h-6 w-6" />
                ) : (
                  <ShieldCheck className="mr-2 h-6 w-6" />
                )}
                {isLoading ? "Verifying..." : "Verify & Continue"}
              </Button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-neutral-100">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading verification system...</p>
          </div>
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  )
}