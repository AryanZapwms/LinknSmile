"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  LifeBuoy,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session, router]);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(value.trim())) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const isEmailValid = validateEmail(email);
    if (!isEmailValid) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      setMessage("OTP sent! Please check your email.");
      setTimeout(() => router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`), 1200);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="hidden flex-col justify-center space-y-8 px-8 lg:flex">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-amber-400 bg-white shadow-lg">
                  <Image
                    src="/companylogo.jpg"
                    alt="Instapeel Logo"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Instapeel</h2>
                  <p className="text-sm text-gray-600">Beauty & Skincare Excellence</p>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl leading-tight font-bold text-gray-900">
                  Recover your
                  <span className="block bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                    Instapeel Access
                  </span>
                </h1>
                <p className="text-lg leading-relaxed text-gray-600">
                  Forgot your password? We'll send a secure verification code to your email so you
                  can reset it and get back to glowing.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Quick Recovery</h3>
                    <p className="text-sm text-gray-600">
                      Receive an OTP instantly to verify your identity
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure Process</h3>
                    <p className="text-sm text-gray-600">Your account safety is our top priority</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <LifeBuoy className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Always Here</h3>
                    <p className="text-sm text-gray-600">
                      Need help? Our support team is ready to assist
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 text-center lg:hidden">
            <div className="mb-4 flex justify-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-amber-400 bg-white shadow-lg">
                <Image
                  src="/companylogo.jpg"
                  alt="Instapeel Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Forgot Password</h1>
            <p className="text-gray-600">We'll help you get back into your account</p>
          </div>

          <div className="mx-auto w-full max-w-md lg:mx-0">
            <Card className="border-2 border-gray-200 bg-white shadow-2xl">
              <CardHeader className="space-y-2 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Reset your password
                </CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Enter your email address and we'll send you a verification code
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <Alert
                      variant="destructive"
                      className="animate-in fade-in slide-in-from-top-2 border-2 border-red-300 bg-red-50 duration-300"
                    >
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="ml-2 font-medium text-red-800">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {message && (
                    <Alert className="animate-in fade-in slide-in-from-top-2 border-2 border-green-300 bg-green-50 duration-300">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <AlertDescription className="ml-2 font-medium text-green-800">
                        {message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <label
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                      htmlFor="email"
                    >
                      <Mail className="h-4 w-4 text-amber-600" />
                      Email Address
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
                        disabled={isLoading}
                        className={`h-12 border-2 pr-10 pl-4 text-base transition-all duration-200 ${
                          emailError
                            ? "border-red-400 bg-red-50 focus:border-red-500"
                            : email && !emailError
                              ? "border-green-400 bg-green-50 focus:border-green-500"
                              : "border-gray-300 hover:border-amber-400 focus:border-amber-500"
                        }`}
                      />
                      {email && !emailError && (
                        <CheckCircle2 className="animate-in zoom-in absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-green-600 duration-200" />
                      )}
                    </div>
                    {emailError && (
                      <p className="animate-in slide-in-from-top-1 flex items-center gap-1 text-sm font-medium text-red-600 duration-200">
                        <AlertCircle className="h-4 w-4" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full transform bg-gradient-to-r from-amber-500 to-amber-600 text-base font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-amber-600 hover:to-amber-700 hover:shadow-xl active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending OTP...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Send OTP
                      </span>
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 font-medium text-gray-600">
                      Remembered your password?
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-base text-gray-700">
                    Return to{" "}
                    <Link
                      href="/auth/login"
                      className="rounded-lg bg-purple-600 py-2 font-semibold text-white transition duration-200 hover:bg-purple-700"
                    >
                      Sign in
                      <span className="text-lg">→</span>
                    </Link>
                  </p>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6 lg:hidden">
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    <span>Secure recovery powered by Instapeel</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
