"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { CartIcon } from "@/components/cart-icon"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, ShoppingBag, ChevronDown, LayoutDashboard } from "lucide-react"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import {
  getCachedSync,
  fetchWithCache,
  prefetchData,
  invalidateCache,
  initCache
} from "@/lib/cacheClient"
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png"



export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)

  const [isHydrated, setIsHydrated] = useState(false)



  const pathParts = useMemo(() => pathname?.split("/") || [], [pathname])

  useEffect(() => {
    setMounted(true)
  }, [])





if (!mounted) return null

  if (pathname?.startsWith("/admin")) return null

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        {/* Main header row */}
        <div className="flex h-16 items-center justify-between gap-4">
          {/* LEFT: Desktop Companies Navigation */}


          {/* CENTER: Logo */}
          <button
            onClick={() => {
              router.push("/");
            }}
            className="flex items-center focus:outline-none shrink-0 cursor-pointer"
            aria-label="Go to home"
          >
            <Image
              src={LinkAndSmileLogo}
              alt="Logo"
              width={100}
              height={100}
              priority
            />
          </button>

          {/* RIGHT: Navigation + Cart + User */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            {/* Navigation Links - Hidden on mobile */}
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/products" className="text-sm hover:underline">
                Products
              </Link>
              <Link href="/about-us" className="text-sm hover:underline">
                About Us
              </Link>
              
              <Link href="/contact-us" className="text-sm hover:underline">
                Contact
              </Link>
            </nav>

            <CartIcon />

            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 h-9 px-2 sm:px-3"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm max-w-[100px] truncate">
                      {session.user.name || session.user.email}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Mobile navigation in dropdown */}
                  <div className="md:hidden">
                    <DropdownMenuItem asChild>
                      <Link href="/products" className="flex items-center gap-2 cursor-pointer">
                        Products
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/about-us" className="flex items-center gap-2 cursor-pointer">
                        About Us
                      </Link>
                    </DropdownMenuItem>
                   
                    <DropdownMenuItem asChild>
                      <Link href="/contact-us" className="flex items-center gap-2 cursor-pointer">
                        Contact
                      </Link>
                    </DropdownMenuItem>
                    <div className="my-1 h-px bg-border" />
                  </div>

                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/orders" className="flex items-center gap-2 cursor-pointer">
                      <ShoppingBag className="h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  {session.user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {session.user.role === "shop_owner" && (
                    <DropdownMenuItem asChild>
                      <Link href="/vendor" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Vendor Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                {/* Mobile: Show menu in dropdown when not logged in */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <User className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/products" className="cursor-pointer">
                          Products
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/about" className="cursor-pointer">
                          About Us
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild>
                        <Link href="/contact-us" className="cursor-pointer">
                          Contact
                        </Link>
                      </DropdownMenuItem>
                      <div className="my-1 h-px bg-border" />
                      <DropdownMenuItem
                        onClick={() => router.push("/auth/login")}
                        className="cursor-pointer"
                      >
                        Sign In
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Desktop sign in */}
                <Button
                  onClick={() => router.push("/auth/login")}
                  variant="default"
                  size="sm"
                  className="hidden md:flex"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile: Horizontal scrollable shops carousel below header */}


      </div>
    </header>
  )
}

function requestIdleCallback(callback: () => void) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(callback)
  } else {
    setTimeout(callback, 1)
  }
}