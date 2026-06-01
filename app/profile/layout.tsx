// app/profile/layout.tsx
"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { User, ShoppingBag, Heart, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/profile",           label: "Profile Settings", icon: User },
  { href: "/profile/orders",    label: "My Orders",        icon: ShoppingBag },
  { href: "/profile/favourites",label: "My Favourites",    icon: Heart },
]

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

  if (status === "unauthenticated") return null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
        <div className="flex flex-col md:flex-row gap-6">

          {/* Sidebar */}
          <aside className="w-full md:w-56 shrink-0">
            <div className="bg-white border border-stone-100 rounded-2xl p-3 shadow-sm sticky top-24">
              {/* User badge */}
              <div className="px-3 py-3 mb-2 border-b border-stone-100">
                <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Account</p>
                <p className="text-sm font-semibold text-stone-800 mt-0.5 truncate">
                  {session?.user?.name || session?.user?.email}
                </p>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 mt-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  // exact match for /profile, prefix match for sub-routes
                  const isActive =
                    href === "/profile"
                      ? pathname === "/profile"
                      : pathname?.startsWith(href)

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-amber-600" : "text-stone-400")} />
                      {label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Page content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}