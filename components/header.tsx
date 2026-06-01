// components/header.tsx
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
import {
  User, LogOut, ShoppingBag, ChevronDown,
  LayoutDashboard, Menu, Tag, Heart, Store, Flag, Globe2,
} from "lucide-react"
import { useEffect, useState, useRef } from "react"
import LinkAndSmileLogo from "@/public/LinkAndSmileLogo.png"

/* ─── Types ─────────────────────────────────────────────── */
interface Category { _id: string; name: string; slug: string }
interface Shop { _id: string; shopName: string; slug: string; logo?: string }

/* ─── Category Card ─────────────────────────────────────── */
function CategoryCard({ category, onClick }: { category: Category; onClick: () => void }) {
  return (
    <Link
      href={`/products?category=${category._id}`}
      onClick={onClick}
      className="group flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50 transition-colors"
    >
      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
        <Tag size={12} className="text-amber-600" />
      </div>
      <span className="text-sm font-medium text-stone-700 group-hover:text-amber-700 transition-colors leading-snug">
        {category.name}
      </span>
    </Link>
  )
}

/* ─── Desktop Mega Menu ─────────────────────────────────── */
function MegaMenu({
  categories,
  shops,
  onClose,
}: {
  categories: Category[]
  shops: Shop[]
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<"categories" | "origin" | "sellers">("categories")

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-3 overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-100"
      style={{ width: "680px" }}
    >
      {/* Accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300" />

      <div className="grid grid-cols-[200px_1fr]">

        {/* Left — Tab nav */}
        <div className="border-r border-stone-100 bg-stone-50 p-4 flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 px-2 mb-2">
            Browse
          </p>

          {/* Tab buttons */}
          {[
            { key: "categories", icon: Tag,    label: "By Category"  },
            { key: "origin",     icon: Flag,   label: "By Origin"    },
            { key: "sellers",    icon: Store,  label: "By Seller"    },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onMouseEnter={() => setActiveTab(key as any)}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === key
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-800"
              }`}
            >
              <Icon size={15} className={activeTab === key ? "text-amber-500" : "text-stone-400"} />
              {label}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-stone-100">
            <Link
              href="/products"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200 transition-colors"
            >
              View All →
            </Link>
          </div>
        </div>

        {/* Right — Tab content */}
        <div className="p-5">

          {/* ── Categories tab ── */}
          {activeTab === "categories" && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
                Shop by Category
              </p>
              <div className="grid grid-cols-2 gap-0.5 overflow-y-auto max-h-[340px]">
                {categories.length === 0 ? (
                  <div className="col-span-2 flex items-center justify-center h-20 text-sm text-stone-400">
                    Loading categories…
                  </div>
                ) : (
                  categories.map((cat) => (
                    <CategoryCard key={cat._id} category={cat} onClick={onClose} />
                  ))
                )}
              </div>
            </>
          )}

          {/* ── Origin tab ── */}
          {activeTab === "origin" && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">
                Shop by Origin
              </p>
              <div className="flex flex-col gap-3">

                {/* Made in India */}
                <Link
                  href="/products?origin=made-in-india"
                  onClick={onClose}
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-green-500 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    🇮🇳
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
                      Made in India
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Proudly crafted by Indian sellers &amp; artisans
                    </p>
                  </div>
                </Link>

                {/* Foreign Made */}
                <Link
                  href="/products?origin=foreign-made"
                  onClick={onClose}
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    🌍
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
                      International Products
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Imported &amp; foreign-made goods
                    </p>
                  </div>
                </Link>

                {/* All Products */}
                <Link
                  href="/products"
                  onClick={onClose}
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    🛍️
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
                      All Products
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Browse everything on LinkAndSmile
                    </p>
                  </div>
                </Link>
              </div>
            </>
          )}

          {/* ── Sellers tab ── */}
          {activeTab === "sellers" && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
                Shop by Seller
              </p>
              {shops.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-sm text-stone-400">
                  Loading shops…
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[320px]">
                  {shops.map((shop) => (
                    <Link
                      key={shop._id}
                      href={`/shop/${shop.slug}`}
                      onClick={onClose}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
                    >
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:bg-amber-200 transition-colors">
                        {shop.logo ? (
                          <img src={shop.logo} alt={shop.shopName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-amber-600 uppercase">
                            {shop.shopName.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-stone-700 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                        {shop.shopName}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-stone-100">
                <Link
                  href="/sellers"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200 transition-colors"
                >
                  <Store size={14} /> View All Sellers →
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

/* ─── Header ────────────────────────────────────────────── */
export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [productsMenuOpen, setProductsMenuOpen] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const hasFetchedCategories = useRef(false)
  const hasFetchedShops = useRef(false)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (hasFetchedCategories.current) return
    hasFetchedCategories.current = true
    fetch("/api/categories?flat=true")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Fetch shops lazily when menu opens
useEffect(() => {
  if (!productsMenuOpen || hasFetchedShops.current) return
  hasFetchedShops.current = true
  fetch("/api/shops?limit=20")
    .then((r) => r.json())
    .then((data) => {
      const list = Array.isArray(data?.shops) ? data.shops : []
      setShops(list)
    })
    .catch(() => {})
}, [productsMenuOpen])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProductsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => { setProductsMenuOpen(false) }, [pathname])

  if (!mounted) return null
  if (pathname?.startsWith("/admin")) return null

  const isVendor = session?.user?.role === "shop_owner"
  const isAdmin = session?.user?.role === "admin"
  const isLoggedIn = !!session?.user

  const navLinks = [
    { href: "/about-us", label: "About Us" },
    { href: "/contact-us", label: "Contact" },
  ]

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-stone-100"
          : "bg-white border-b border-stone-100"
      }`}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 focus:outline-none group shrink-0"
            aria-label="Go to home"
          >
            <div className="relative w-16 h-9 rounded-xl overflow-hidden ring-1 ring-amber-200 group-hover:ring-amber-400 transition-all duration-200">
              <Image src={LinkAndSmileLogo} alt="LinkAndSmile" fill className="object-cover" priority />
            </div>
            {/* <div className="hidden sm:flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-stone-900">LinkAndSmile</span>
              <span className="text-[10px] text-stone-400 tracking-widest uppercase font-medium">India's Marketplace</span>
            </div> */}
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">

            {/* Products mega menu trigger */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProductsMenuOpen((v) => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  pathname?.startsWith("/products") || productsMenuOpen
                    ? "bg-amber-50 text-amber-700"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                Products
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${productsMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {productsMenuOpen && (
                <MegaMenu
                  categories={categories}
                  shops={shops}
                  onClose={() => setProductsMenuOpen(false)}
                />
              )}
            </div>

            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  pathname === href
                    ? "bg-amber-50 text-amber-700"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                {label}
              </Link>
            ))}

            {/* Sell with us — hidden for vendors & admins */}
            {!isVendor && !isAdmin && (
              <Link
                href="/register-as-seller"
                className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all duration-150"
              >
                Sell with us
              </Link>
            )}

            {/* Dashboard shortcut for vendors & admins */}
            {(isVendor || isAdmin) && (
              <Link
                href={isAdmin ? "/admin" : "/vendor"}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all duration-150"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {isLoggedIn && <CartIcon />}

            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 sm:px-3 hover:bg-stone-50 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-amber-700" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-stone-700 max-w-[100px] truncate">
                      {session.user.name?.split(" ")[0] || "Account"}
                    </span>
                    <ChevronDown className="h-3 w-3 text-stone-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border border-stone-100 p-1">
                  <div className="px-3 py-2 mb-1">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Account</p>
                    <p className="text-sm font-medium text-stone-800 truncate mt-0.5">
                      {session.user.name || session.user.email}
                    </p>
                  </div>
                  <div className="h-px bg-stone-100 mb-1" />

                  {/* Mobile nav links */}
                  <div className="md:hidden">
                    <DropdownMenuItem asChild>
                      <Link href="/products" className="cursor-pointer rounded-lg text-sm">Products</Link>
                    </DropdownMenuItem>
                    {navLinks.map(({ href, label }) => (
                      <DropdownMenuItem key={href} asChild>
                        <Link href={href} className="cursor-pointer rounded-lg text-sm">{label}</Link>
                      </DropdownMenuItem>
                    ))}
                    <div className="h-px bg-stone-100 my-1" />
                  </div>

                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer rounded-lg text-sm">
                      <User className="h-4 w-4 text-stone-400" /> My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/orders" className="flex items-center gap-2 cursor-pointer rounded-lg text-sm">
                      <ShoppingBag className="h-4 w-4 text-stone-400" /> My Orders
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2 cursor-pointer rounded-lg text-sm">
                        <LayoutDashboard className="h-4 w-4 text-stone-400" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isVendor && (
                    <DropdownMenuItem asChild>
                      <Link href="/vendor" className="flex items-center gap-2 cursor-pointer rounded-lg text-sm">
                        <LayoutDashboard className="h-4 w-4 text-stone-400" /> Vendor Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <div className="h-px bg-stone-100 my-1" />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-2 cursor-pointer rounded-lg text-sm text-red-500 focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                        <Menu className="h-5 w-5 text-stone-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl border border-stone-100 p-1">
                      <DropdownMenuItem asChild>
                        <Link href="/products" className="cursor-pointer rounded-lg text-sm">Products</Link>
                      </DropdownMenuItem>
                      {navLinks.map(({ href, label }) => (
                        <DropdownMenuItem key={href} asChild>
                          <Link href={href} className="cursor-pointer rounded-lg text-sm">{label}</Link>
                        </DropdownMenuItem>
                      ))}
                      <div className="h-px bg-stone-100 my-1" />
                      <DropdownMenuItem onClick={() => router.push("/auth/login")} className="cursor-pointer rounded-lg text-sm">
                        Sign In
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button
                  onClick={() => router.push("/auth/login")}
                  size="sm"
                  className="hidden md:flex bg-stone-900 hover:bg-stone-800 text-white rounded-xl h-9 px-4 text-sm font-medium"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}