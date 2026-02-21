'use client'

import type React from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BookOpen,
  Users,
  Layers,
  LogOut,
  Building2,
  Settings,
  Megaphone,
  MessageSquare,
  Menu,
  X,
  SearchX,
  Image as ImageIcon,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingCart className="w-5 h-5" /> },
  { href: "/admin/products", label: "Products", icon: <Package className="w-5 h-5" /> },
  { href: "/admin/categories", label: "Categories", icon: <Layers className="w-5 h-5" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="w-5 h-5" /> },
  { href: "/admin/promos", label: "Promo Bar", icon: <Megaphone className="w-5 h-5" /> },
  { href: "/admin/product-approvals", label: "Product Approvals", icon: <Package className="w-5 h-5" /> },
  { href: "/admin/vendors", label: "Vendors", icon: <Users className="w-5 h-5" /> },
  { href: "/admin/setup", label: "Setup", icon: <Settings className="w-5 h-5" /> },
  { href: "/admin/payouts", label: "Payouts", icon: <DollarSign className="w-5 h-5" /> },
  { href: "/admin/settings", label: "Payment Settings", icon: <Settings className="w-5 h-5" /> },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [hovered, setHovered] = useState(false)

  // ✅ Mount check
  useEffect(() => {
    setMounted(true)

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
      if (window.innerWidth >= 1024) setSidebarOpen(false)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login")
  }, [status, router])

  // Prevent SSR mismatch
  if (!mounted) return null

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading admin...</p>
      </main>
    )
  }

  if (!session || status === "unauthenticated") return null

  const isAdmin = (session.user as any)?.role === "admin"

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAF6E8] px-4">
        <Card className="w-full max-w-md border border-amber-200 shadow-sm bg-[#FFFDF7] text-center rounded-2xl">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 flex items-center justify-center rounded-full bg-purple-50">
                <SearchX className="w-10 h-10 text-purple-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Page Not Found</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <p className="text-gray-600">
              Oops! The page you’re looking for doesn’t exist or may have been moved.
            </p>

            <div className="pt-2">
              <Button
                className="w-full h-10 font-semibold"
                style={{ backgroundColor: "#7c3aed", color: "#fff" }}
                onClick={() => router.push("/")}
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  const isRouteActive = (href: string) => pathname === href

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky left-0 top-0 h-screen z-40 transition-all duration-300 border-r border-border bg-card flex flex-col
          ${sidebarOpen || hovered ? "w-64" : "w-0 lg:w-20"}
        `}
        onMouseEnter={() => isDesktop && setHovered(true)}
        onMouseLeave={() => {
          isDesktop && setHovered(false)
          setSidebarOpen(false)
        }}
      >
        {/* Sidebar Header */}
        <div className="p-4 lg:p-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-14 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-foreground">Admin</span>
            </div>
            <div
              className={`overflow-hidden transition-opacity duration-300 ${
                sidebarOpen || hovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <h2 className="text-sm font-bold text-foreground">{mounted && "Admin"}</h2>
              <p className="text-xs text-muted-foreground truncate">
                {mounted && session.user?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="space-y-1 p-2 lg:p-1.5" aria-label="Admin navigation">
            {navItems.map((item) => {
              const active = isRouteActive(item.href)
              const baseClasses = `w-full gap-3 transition-all ${
                sidebarOpen || hovered ? "px-4 justify-start" : "lg:px-2 px-4 justify-center"
              }`
              const activeClasses = active ? "bg-black text-white" : "hover:bg-black hover:text-white"

              return (
                <div key={item.href} className="rounded-md overflow-hidden">
                  <Button
                    variant="ghost"
                    className={`${baseClasses} ${activeClasses}`}
                    onClick={() => {
                      setSidebarOpen(false)
                      router.push(item.href)
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span
                      className={`overflow-hidden transition-all duration-300 ${
                        sidebarOpen || hovered ? "opacity-100 w-auto" : "opacity-0 w-0"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Button>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="cursor-pointer p-2 border-t border-border mt-auto">
          <Button
            variant="outline"
            className={`w-full gap-3 justify-start bg-red-600 hover:bg-red-700 text-white border-0 transition-all ${
              sidebarOpen || hovered ? "px-4 justify-start" : "lg:px-2 px-4 justify-center"
            }`}
            onClick={async () => {
              try {
                await signOut({ redirect: false })
              } catch (err) {
                console.error("signOut error:", err)
              } finally {
                router.push("/")
              }
            }}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span
              className={`overflow-hidden transition-all duration-300 ${
                sidebarOpen || hovered ? "opacity-100 w-auto" : "opacity-0 w-0"
              }`}
            >
              Logout
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full pt-16 lg:pt-0 overflow-auto p-7">{mounted && children}</main>
    </div>
  )
}
