"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const otp = searchParams.get("otp") || ""
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error resetting password")
      setMessage("Password updated successfully!")
      setTimeout(() => router.push("/auth/login"), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-center">Reset Password</h1>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 border-2 border-gray-300"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-3 text-gray-500"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {error && (
          <p className="text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}
        {message && (
          <p className="text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> {message}
          </p>
        )}

        <Button type="submit" className="w-full h-12" disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Update Password"}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}