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

interface Company {
  _id: string
  name: string
  slug: string
}

/** Cache configuration */
const COMPANIES_KEY = "companies:all"
const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24

async function fetchCompaniesFromApi(etag?: string): Promise<{
  data: Company[]
  etag?: string
  notModified?: boolean
}> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (etag) {
    headers['If-None-Match'] = etag
  }

  const res = await fetch("/api/companies", {
    cache: "no-store",
    headers
  })

  if (res.status === 304) {
    return { data: [], notModified: true }
  }

  if (!res.ok) throw new Error("Failed to fetch companies")

  const json = await res.json()
  const data = Array.isArray(json) ? json : (json?.data ?? [])
  const responseEtag = res.headers.get('etag') || undefined

  return { data, etag: responseEtag }
}

async function fetchCompanies(): Promise<Company[]> {
  const result = await fetchCompaniesFromApi()
  return result.data
}

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const hasFetchedRef = useRef(false)
  const prefetchedRef = useRef(new Set<string>())



  const pathParts = useMemo(() => pathname?.split("/") || [], [pathname])
  const isOnShopPage = pathParts[1] === "shop" && !!pathParts[2]
  const isOnHomePage = pathname === "/"
  const companySlug = pathParts[2]

  useEffect(() => {
    setMounted(true)
  }, [])



  // Handle hydration and load cached companies after client hydrates
  useEffect(() => {
    setIsHydrated(true)
    initCache()

    const cachedCompanies = getCachedSync<Company[]>(COMPANIES_KEY, MAX_AGE) ?? []
    if (cachedCompanies.length > 0) {
      setCompanies(cachedCompanies)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!companySlug) {
      setCurrentCompany(null)
      return
    }

    if (companies.length > 0) {
      const found = companies.find((c) => c.slug === companySlug)
      setCurrentCompany(found ?? null)
    }
  }, [companySlug, companies])

  // Prefetch critical routes for better navigation performance
  useEffect(() => {
    if (typeof window !== 'undefined') {
      router.prefetch('/')
      router.prefetch('/cart')
      router.prefetch('/auth/login')

      if (session?.user?.role === 'admin') {
        router.prefetch('/admin')
      }
      if (session?.user?.role === 'shop_owner') {
        router.prefetch('/vendor')
      }
    }
  }, [router, session])

  useEffect(() => {
    if (!isOnHomePage && !pathname?.startsWith("/")) {
      return
    }

    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    let mounted = true
    setErrorMsg(null)

    const loadCompanies = async () => {
      try {
        const data = await fetchWithCache(
          COMPANIES_KEY,
          fetchCompanies,
          {
            ttlMs: TTL,
            maxAgeMs: MAX_AGE,
            backgroundRefresh: true,
            persistToStorage: true
          }
        )

        if (!mounted) return

        setCompanies(data)
        setIsLoading(false)

        if (companySlug) {
          const found = data.find((c) => c.slug === companySlug)
          setCurrentCompany(found ?? null)
        }

        requestIdleCallback(() => {
          prefetchCompanyRoutes(data, companySlug)
        })
      } catch (err) {
        if (!mounted) return
        console.error("Error fetching companies:", err)
        setErrorMsg("Failed to load shops")
        setIsLoading(false)
      }
    }

    loadCompanies()

    return () => {
      mounted = false
    }
  }, [pathname, isOnHomePage, companySlug])

  const prefetchCompanyRoutes = useCallback((data: Company[], currentSlug?: string) => {
    const toPrefetch: Company[] = []

    toPrefetch.push(...data.slice(0, 5))

    if (currentSlug) {
      const currentIndex = data.findIndex(c => c.slug === currentSlug)
      if (currentIndex > 0) {
        toPrefetch.push(data[currentIndex - 1])
      }
      if (currentIndex < data.length - 1) {
        toPrefetch.push(data[currentIndex + 1])
      }
    }

    const uniqueCompanies = Array.from(new Map(toPrefetch.map(c => [c._id, c])).values())

    uniqueCompanies.forEach((c) => {
      if (!prefetchedRef.current.has(c.slug)) {
        prefetchedRef.current.add(c.slug)
        try {
          router.prefetch(`/shop/${c.slug}`)
        } catch { }
      }
    })
  }, [router])

  const selectCompany = useCallback(
    (company: Company | null) => {
      if (company) {
        router.push(`/shop/${company.slug}`)
      } else {
        router.push("/shop")
      }

      setCurrentCompany(company)

      requestIdleCallback(() => {
        if (company) {
          if (!prefetchedRef.current.has(company.slug)) {
            prefetchedRef.current.add(company.slug)
            router.prefetch(`/shop/${company.slug}`)
          }

          const index = companies.findIndex((c) => c._id === company._id)
          const neighbors = [companies[index - 1], companies[index + 1]].filter(Boolean)

          neighbors.forEach((n) => {
            if (!prefetchedRef.current.has(n!.slug)) {
              prefetchedRef.current.add(n!.slug)
              router.prefetch(`/shop/${n!.slug}`)
            }
          })
        }
      })
    },
    [router, companies]
  )

if (!mounted) return null

  if (pathname?.startsWith("/admin")) return null

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        {/* Main header row */}
        <div className="flex h-16 items-center justify-between gap-4">
          {/* LEFT: Desktop Companies Navigation */}
          <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0">
            <div
              ref={containerRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {isLoading && companies.length === 0 ? (
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-9 w-24 animate-pulse rounded-lg bg-muted"
                    />
                  ))}
                </div>
              ) : errorMsg ? (
                <div className="text-sm text-muted-foreground">Browse Shops</div>
              ) : companies.length === 0 ? (
                <div className="text-sm text-muted-foreground">Shop</div>
              ) : (
                companies.map((company) => {
                  const active = currentCompany?._id === company._id
                  return (
                    <button
                      key={company._id}
                      onClick={() => selectCompany(company)}
                      onMouseEnter={() => {
                        if (!prefetchedRef.current.has(company.slug)) {
                          prefetchedRef.current.add(company.slug)
                          router.prefetch(`/shop/${company.slug}`)
                        }
                      }}
                      className={`px-4 py-2 text-sm rounded-lg border whitespace-nowrap transition-all duration-200 transform ${active
                        ? "bg-foreground text-background border-foreground shadow-sm"
                        : "bg-transparent border-foreground/20 hover:border-foreground hover:bg-foreground hover:text-background focus:border-foreground focus:shadow-sm hover:scale-[1.02]"
                        } cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground/50`}
                      aria-pressed={active}
                      aria-label={`Shop ${company.name}`}
                    >
                      {company.name}
                    </button>
                  )
                })
              )}
            </div>
          </div>

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
              <Link href="/blog" className="text-sm hover:underline">
                Blogs
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
                      <Link href="/blogs" className="flex items-center gap-2 cursor-pointer">
                        Blogs
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
                    <Link href="/orders" className="flex items-center gap-2 cursor-pointer">
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
                        <Link href="/blogs" className="cursor-pointer">
                          Blogs
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
        <div className="relative block md:hidden">
  <div
    className="overflow-x-auto scrollbar-hide scroll-smooth pb-1 px-1"
    style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    }}
  >
    <div className="flex justify-center gap-3 w-max mx-auto">
      {companies.map((company) => {
        const active = currentCompany?._id === company._id
        return (
          <button
            key={company._id}
            onClick={() => selectCompany(company)}
            className={`shrink-0 flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 min-w-[90px] ${
              active
                ? "bg-foreground text-background border-foreground shadow-lg scale-105"
                : "bg-background border-foreground/20 hover:border-foreground hover:shadow-md active:scale-95"
            }`}
            aria-pressed={active}
            aria-label={`Shop ${company.name}`}
          >
            <span className="text-xs font-medium text-center leading-tight line-clamp-2">
              {company.name}
            </span>
          </button>
        )
      })}
    </div>
  </div>

  {/* Scroll indicators */}
  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
</div>

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