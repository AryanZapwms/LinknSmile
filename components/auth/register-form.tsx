"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { trackCompleteRegistration } from "@/lib/facebook-pixel";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, UserRound, Verified } from "lucide-react";
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
    if (session?.user) {
      router.push("/");
    }
  }, [session, router]);

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (value.trim().length < 2) {
      setNameError("Please enter your full name");
      return false;
    }
    setNameError("");
    return true;
  };

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

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }
    if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmError("Please confirm your password");
      return false;
    }
    if (value !== password) {
      setConfirmError("Passwords do not match");
      return false;
    }
    setConfirmError("");
    return true;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirmPassword(confirmPassword);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      try {
        trackCompleteRegistration(email, "completed");
      } catch (_) {}

      setShowOtp(true);
      return;
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (showOtp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary-soft/50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-lg border border-primary-500/10 shadow-xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl rounded-2xl overflow-hidden animate-scale-in">
          <CardHeader className="space-y-2 pb-6 bg-gradient-primary-soft/70 dark:bg-primary-500/5 border-b border-primary-500/10">
            <CardTitle className="text-2xl font-bold text-gradient">Verify Your Email</CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Enter the verification code we sent to <span className="font-semibold text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <OtpForm
              email={email}
              onSuccess={() => {
                router.push("/auth/login?registered=true&verified=true");
              }}
            />
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already verified?{" "}
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                disabled={isLoading}
              >
                Sign in here
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary-soft/50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl animate-slide-up">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Welcome Section */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 px-8">
            <div className="space-y-6">
              <h1 className="text-5xl font-bold leading-tight text-gradient">
                Join the
              </h1>
              
              <div className="flex items-center gap-4">
                <div className="relative w-full max-w-[400px] h-40 rounded-2xl overflow-hidden shadow-glow ring-primary-500/20">
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
                <h2 className="text-3xl font-bold text-foreground">Glow Community</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Create your account to access curated skincare routines, exclusive offers, and personalized beauty guidance tailored just for you.
                </p>
              </div>

              {/* Features with premium styling */}
              <div className="space-y-4 pt-4">
                {[
                  { icon: Sparkles, title: "Curated Experiences", desc: "Tailored skincare journeys designed by experts" },
                  { icon: ShieldCheck, title: "Secure & Private", desc: "Your information stays protected with us" },
                  { icon: Verified, title: "Verified Results", desc: "Trusted by thousands of radiant customers" }
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

          {/* Right Side - Register Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="border border-primary-500/10 shadow-xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl rounded-2xl overflow-hidden">
              
              <CardHeader className="space-y-2 pb-6 bg-gradient-primary-soft/70 dark:bg-primary-500/5 border-b border-primary-500/10">
                <CardTitle className="text-2xl font-bold text-gradient">
                  Create Account
                </CardTitle>
                <CardDescription className="text-muted-foreground text-base">
                  Fill in your details to start your LinkAndSmile journey
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={onSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="bg-error-50/90 dark:bg-error-500/10 border-2 border-error-200 animate-scale-in">
                      <AlertCircle className="h-5 w-5 text-error-600" />
                      <AlertDescription className="ml-2 text-error-700 dark:text-error-300 font-medium whitespace-pre-wrap">
                        {typeof error === "string" ? error : JSON.stringify(error)}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Name Field */}
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-primary-500" />
                      Full Name
                    </label>
                    <div className="relative">
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) validateName(e.target.value);
                        }}
                        onBlur={() => validateName(name)}
                        className={`pl-4 pr-10 h-12 text-base border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 ${
                          nameError
                            ? "border-error-400 focus:border-error-500 bg-error-50/50"
                            : name && !nameError
                            ? "border-success-400 focus:border-success-500 bg-success-50/50"
                            : "border-input hover:border-primary-400"
                        }`}
                        disabled={isLoading}
                      />
                      {name && !nameError && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-success-600 animate-scale-in" />
                      )}
                    </div>
                    {nameError && (
                      <p className="text-sm text-error-600 flex items-center gap-1 font-medium animate-slide-up">
                        <AlertCircle className="h-4 w-4" />
                        {nameError}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary-500" />
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
                        className={`pl-4 pr-10 h-12 text-base border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 ${
                          emailError
                            ? "border-error-400 focus:border-error-500 bg-error-50/50"
                            : email && !emailError
                            ? "border-success-400 focus:border-success-500 bg-success-50/50"
                            : "border-input hover:border-primary-400"
                        }`}
                        disabled={isLoading}
                      />
                      {email && !emailError && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-success-600 animate-scale-in" />
                      )}
                    </div>
                    {emailError && (
                      <p className="text-sm text-error-600 flex items-center gap-1 font-medium animate-slide-up">
                        <AlertCircle className="h-4 w-4" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary-500" />
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                          if (confirmPassword) validateConfirmPassword(confirmPassword);
                        }}
                        onBlur={() => validatePassword(password)}
                        className={`pl-4 pr-12 h-12 text-base border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 ${
                          passwordError
                            ? "border-error-400 focus:border-error-500 bg-error-50/50"
                            : password && !passwordError
                            ? "border-success-400 focus:border-success-500 bg-success-50/50"
                            : "border-input hover:border-primary-400"
                        }`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary-600 transition-colors p-1 rounded-md hover:bg-gradient-primary-soft"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-error-600 flex items-center gap-1 font-medium animate-slide-up">
                        <AlertCircle className="h-4 w-4" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary-500" />
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (confirmError) validateConfirmPassword(e.target.value);
                        }}
                        onBlur={() => validateConfirmPassword(confirmPassword)}
                        className={`pl-4 pr-12 h-12 text-base border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 ${
                          confirmError
                            ? "border-error-400 focus:border-error-500 bg-error-50/50"
                            : confirmPassword && !confirmError
                            ? "border-success-400 focus:border-success-500 bg-success-50/50"
                            : "border-input hover:border-primary-400"
                        }`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary-600 transition-colors p-1 rounded-md hover:bg-gradient-primary-soft"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmError && (
                      <p className="text-sm text-error-600 flex items-center gap-1 font-medium animate-slide-up">
                        <AlertCircle className="h-4 w-4" />
                        {confirmError}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 border border-primary-500/10 bg-purple-500 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] hover:text-white font-bold rounded-xl transition-all duration-300 transform"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-card text-muted-foreground font-medium">
                      Already a member?
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-base text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/auth/login")}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold hover:underline transition-colors duration-300 inline-flex items-center gap-1"
                      disabled={isLoading}
                    >
                      Sign in now →
                    </button>
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
