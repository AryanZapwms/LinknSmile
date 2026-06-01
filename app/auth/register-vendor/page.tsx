"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Store, User, Lock, Mail, Phone, MapPin, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, ShieldCheck, Sparkles, Building2, FileText } from "lucide-react"
import Image from "next/image"
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png"

export default function RegisterVendorPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    shopName: "",
    description: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    password: "",
    confirmPassword: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.phone) {
        setError("Please fill in all personal information fields.")
        return
      }
    }
    if (step === 2) {
      if (!formData.shopName || !formData.street || !formData.city || !formData.state || !formData.pincode) {
        setError("Please fill in all required shop and address fields.")
        return
      }
    }
    setError("")
    setStep(step + 1)
  }

  const prevStep = () => setStep(step - 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || data.error || "Registration failed")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/auth/verify-otp?email=${formData.email}`)
      }, 2000)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary-soft/50 dark:bg-neutral-900 p-4">
        <Card className="w-full max-w-md border border-primary-500/10 shadow-xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl rounded-2xl overflow-hidden animate-scale-in">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gradient">Application Received!</h2>
              <p className="text-muted-foreground text-lg">
                Redirecting you to verify your email...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary-soft/50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl animate-slide-up">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Brand & Benefits */}
          <div className="hidden lg:flex flex-col space-y-10 px-8">
            <div className="space-y-6">
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
                <h1 className="text-5xl font-bold leading-tight text-gradient">
                  Grow Your Business 
                </h1>
                <h2 className="text-3xl font-bold text-foreground">As a LinkAndSmile Vendor</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Join our premium marketplace and connect with thousands of customers looking for professional skincare solutions.
                </p>
              </div>

              <div className="grid gap-6">
                {[
                  { icon: Building2, title: "Market Growth", desc: "Access a rapidly expanding customer base" },
                  { icon: ShieldCheck, title: "Quality Partners", desc: "Join an elite community of verified vendors" },
                  { icon: Sparkles, title: "Premium Support", desc: "Dedicated assistance for your shop management" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-primary-soft flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Step Form */}
          <div className="w-full max-w-xl mx-auto lg:mx-0">
            <Card className="border border-primary-500/10 shadow-xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="space-y-4 pb-8 bg-gradient-primary-soft/70 dark:bg-primary-500/5 border-b border-primary-500/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-gradient">Vendor Application</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">
                      Step {step} of 3: {step === 1 ? "Personal Info" : step === 2 ? "Shop Details" : "Security"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-2.5 w-12 rounded-full transition-all duration-300 ${
                          s <= step ? "bg-primary-500 shadow-glow" : "bg-neutral-200 dark:bg-neutral-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive" className="bg-error-50/90 dark:bg-error-500/10 border-2 border-error-200 animate-scale-in">
                      <AlertCircle className="h-5 w-5" />
                      <AlertDescription className="ml-2 font-medium whitespace-pre-wrap">
                        {typeof error === "string" ? error : JSON.stringify(error)}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="min-h-[400px]">
                    {step === 1 && (
                      <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-bold flex items-center gap-2">
                            <User className="w-4 h-4 text-primary-500" /> Full Name *
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="h-12 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-bold flex items-center gap-2">
                            <Mail className="w-4 h-4 text-primary-500" /> Email Address *
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="vendor@linknsmile.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="h-12 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm font-bold flex items-center gap-2">
                            <Phone className="w-4 h-4 text-primary-500" /> Phone Number *
                          </Label>
                          <Input
                            id="phone"
                            name="phone"
                            placeholder="+91 00000 00000"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="h-12 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="shopName" className="text-sm font-bold flex items-center gap-2">
                            <Store className="w-4 h-4 text-primary-500" /> Shop Name *
                          </Label>
                          <Input
                            id="shopName"
                            name="shopName"
                            placeholder="LinkAndSmile Exclusive"
                            value={formData.shopName}
                            onChange={handleChange}
                            required
                            className="h-11 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="street" className="text-sm font-bold flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-500" /> Street Address *
                          </Label>
                          <Input
                            id="street"
                            name="street"
                            placeholder="123 Main St"
                            value={formData.street}
                            onChange={handleChange}
                            required
                            className="h-11 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city" className="text-sm font-bold">City *</Label>
                            <Input
                              id="city"
                              name="city"
                              placeholder="Mumbai"
                              value={formData.city}
                              onChange={handleChange}
                              required
                              className="h-11 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state" className="text-sm font-bold">State *</Label>
                            <Input
                              id="state"
                              name="state"
                              placeholder="Maharashtra"
                              value={formData.state}
                              onChange={handleChange}
                              required
                              className="h-11 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pincode" className="text-sm font-bold">Pincode *</Label>
                          <Input
                            id="pincode"
                            name="pincode"
                            placeholder="400001"
                            value={formData.pincode}
                            onChange={handleChange}
                            required
                            className="h-11 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="gstNumber" className="text-sm font-bold flex items-center gap-2">
                              <FileText className="w-3 h-3" /> GST (Opt)
                            </Label>
                            <Input
                              id="gstNumber"
                              name="gstNumber"
                              placeholder="GST-123"
                              value={formData.gstNumber}
                              onChange={handleChange}
                              className="h-11 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="panNumber" className="text-sm font-bold flex items-center gap-2">
                              <FileText className="w-3 h-3" /> PAN (Opt)
                            </Label>
                            <Input
                              id="panNumber"
                              name="panNumber"
                              placeholder="PAN-123"
                              value={formData.panNumber}
                              onChange={handleChange}
                              className="h-11 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-sm font-bold flex items-center gap-2">
                            <Lock className="w-4 h-4 text-primary-500" /> Password *
                          </Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="h-12 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-sm font-bold flex items-center gap-2">
                            <Lock className="w-4 h-4 text-primary-500" /> Confirm Password *
                          </Label>
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className="h-12 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <div className="pt-4 p-4 rounded-xl bg-primary-50/50 border border-primary-100 italic text-sm text-primary-700">
                          By submitting this application, you agree to our Vendor Terms and Conditions. Our team will review your application within 24-48 hours.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-border">
                    {step > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="flex-1 h-12 rounded-xl font-bold border-2"
                      >
                        <ChevronLeft className="mr-2 h-5 w-5" /> Back
                      </Button>
                    )}
                    {step < 3 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="flex-1 h-12 rounded-xl font-bold bg-purple-500 text-white hover:bg-purple-600 hover:shadow-glow transition-all"
                      >
                        Continue <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 hover:shadow-glow transition-all"
                      >
                        {loading ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-5 w-5" />
                        )}
                        {loading ? "Registering..." : "Submit Application"}
                      </Button>
                    )}
                  </div>
                </form>

                <div className="mt-8 text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Already have a vendor account?{" "}
                    <Link
                      href="/auth/login"
                      className="text-primary-600 font-bold hover:underline"
                    >
                      Login here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}