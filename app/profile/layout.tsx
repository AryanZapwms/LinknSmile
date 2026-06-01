"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"


export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const isProfilePage = pathname === "/profile"
  const isOrdersPage = pathname?.startsWith("/profile/orders")

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
