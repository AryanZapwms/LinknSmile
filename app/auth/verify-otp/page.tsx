"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png";

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const isReset = searchParams.get("reset") === "true";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!email) {
      router.push("/auth/login");
    }
  }, [email, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isReset ? "/api/auth/verify-reset-otp" : "/api/auth/verify-otp";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Verification failed");
      }

      setSuccess("Account verified successfully!");

      setTimeout(() => {
        if (isReset) {
          router.push(`/auth/reset-password?email=${email}&otp=${otp}`);
        } else {
          router.push("/auth/login?registered=true&verified=true");
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-gradient-primary-soft/50 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 dark:bg-neutral-900">
      <div className="animate-scale-in w-full max-w-lg">
        <Card className="border-primary-500/10 overflow-hidden rounded-2xl border bg-white/90 shadow-xl backdrop-blur-xl dark:bg-neutral-800/90">
          <CardHeader className="bg-gradient-primary-soft/70 dark:bg-primary-500/5 border-primary-500/10 space-y-4 border-b pb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative h-16 w-40">
                <Image src={LinkAndSmileLogo} alt="LinkAndSmile" fill className="object-contain" />
              </div>
            </div>
            <CardTitle className="text-gradient text-3xl font-bold">Verify Your Identity</CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              We've sent a 6-digit verification code to
              <div className="text-foreground mt-1 flex items-center justify-center gap-1 font-bold">
                <Mail className="text-primary-500 h-4 w-4" /> {email}
              </div>
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pt-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert
                  variant="destructive"
                  className="bg-error-50 border-error-100 animate-slide-up border-2"
                >
                  <AlertCircle className="text-error-600 h-5 w-5" />
                  <AlertDescription className="text-error-700 ml-2 font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-success-50 border-success-100 animate-slide-up border-2">
                  <CheckCircle2 className="text-success-600 h-5 w-5" />
                  <AlertDescription className="text-success-700 ml-2 font-medium">
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
                    className="focus:ring-primary-500/10 h-16 rounded-2xl border-2 border-neutral-200 text-center text-3xl font-bold tracking-[0.5em] transition-all focus:ring-4"
                    disabled={isLoading || success !== ""}
                  />
                </div>
                <p className="text-muted-foreground text-center text-sm">
                  Didn't receive the code?{" "}
                  <button type="button" className="text-primary-600 font-bold hover:underline">
                    Resend Code
                  </button>
                </p>
              </div>

              <Button
                type="submit"
                className="shadow-glow h-14 w-full rounded-xl bg-purple-600 text-lg font-bold transition-all hover:bg-purple-700"
                disabled={isLoading || success !== "" || otp.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-6 w-6" />
                )}
                {isLoading ? "Verifying..." : "Verify & Continue"}
              </Button>
            </form>

            <div className="mt-8 border-t border-neutral-100 pt-6 text-center">
              <Link
                href="/auth/login"
                className="text-muted-foreground hover:text-primary-600 inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="text-primary-500 h-12 w-12 animate-spin" />
            <p className="text-muted-foreground animate-pulse font-medium">
              Loading verification system...
            </p>
          </div>
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
