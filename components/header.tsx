// components/header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CartIcon } from "@/components/cart-icon";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Tag,
  Heart,
  Store,
  Flag,
  Globe2,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import LinkAndSmileLogo from "@/public/linknsmile_newOne.png";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MashrabiyaPattern } from "@/components/ui/mashrabiya-pattern";
import { IS_INDIA } from "@/lib/site-config";

// Warm accent color classes — amber (India) vs. gold (AE/Gulf). Same
// shade "slots" as the amber-* Tailwind scale so every existing accent
// spot (mega menu, badges, CTAs) retints in place without restructuring.
const accent = IS_INDIA
  ? {
      bar: "from-amber-300 via-amber-400 to-amber-300",
      bg50: "bg-amber-50",
      bg100: "bg-amber-100",
      hoverBg50: "hover:bg-amber-50",
      groupHoverBg200: "group-hover:bg-amber-200",
      text500: "text-amber-500",
      text600: "text-amber-600",
      text700: "text-amber-700",
      groupHoverText700: "group-hover:text-amber-700",
      border200: "border-amber-200",
      hoverBorder200: "hover:border-amber-200",
      hoverBg500: "hover:bg-amber-500",
      ring400: "group-hover:ring-amber-400",
    }
  : {
      bar: "from-gold-300 via-gold-500 to-gold-300",
      bg50: "bg-gold-50",
      bg100: "bg-gold-100",
      hoverBg50: "hover:bg-gold-50",
      groupHoverBg200: "group-hover:bg-gold-200",
      text500: "text-gold-500",
      text600: "text-gold-600",
      text700: "text-gold-700",
      groupHoverText700: "group-hover:text-gold-700",
      border200: "border-gold-200",
      hoverBorder200: "hover:border-gold-200",
      hoverBg500: "hover:bg-gold-500",
      ring400: "group-hover:ring-gold-400",
    };

/* ─── Types ─────────────────────────────────────────────── */
interface Category {
  _id: string;
  name: string;
  slug: string;
}
interface Shop {
  _id: string;
  shopName: string;
  slug: string;
  logo?: string;
}

/* ─── Category Card ─────────────────────────────────────── */
function CategoryCard({ category, onClick }: { category: Category; onClick: () => void }) {
  return (
    <Link
      href={`/products?category=${category._id}`}
      onClick={onClick}
      className={`group flex items-center gap-2.5 rounded-xl p-2.5 transition-colors ${accent.hoverBg50}`}
    >
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${accent.bg100} transition-colors ${accent.groupHoverBg200}`}
      >
        <Tag size={12} className={accent.text600} />
      </div>
      <span
        className={`text-sm leading-snug font-medium text-stone-700 transition-colors ${accent.groupHoverText700}`}
      >
        {category.name}
      </span>
    </Link>
  );
}

/* ─── Desktop Mega Menu ─────────────────────────────────── */
function MegaMenu({
  categories,
  shops,
  onClose,
}: {
  categories: Category[];
  shops: Shop[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"categories" | "origin" | "sellers">("categories");
  const t = useTranslations("Header.megaMenu");

  return (
    <div
      className="absolute top-full left-1/2 z-50 mt-3 -translate-x-1/2 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-2xl"
      style={{ width: "680px" }}
    >
      {/* Accent bar */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${accent.bar}`} />

      <div className="grid grid-cols-[200px_1fr]">
        {/* Left — Tab nav */}
        <div className="flex flex-col gap-1 border-r border-stone-100 bg-stone-50 p-4">
          <p className="mb-2 px-2 text-xs font-bold tracking-widest text-stone-400 uppercase">
            {t("browse")}
          </p>

          {/* Tab buttons */}
          {[
            { key: "categories", icon: Tag, label: t("byCategory") },
            { key: "origin", icon: Flag, label: t("byOrigin") },
            { key: "sellers", icon: Store, label: t("bySeller") },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onMouseEnter={() => setActiveTab(key as any)}
              onClick={() => setActiveTab(key as any)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-medium transition-colors ${
                activeTab === key
                  ? `bg-white ${accent.text700} shadow-sm`
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-800"
              }`}
            >
              <Icon size={15} className={activeTab === key ? accent.text500 : "text-stone-400"} />
              {label}
            </button>
          ))}

          <div className="mt-auto border-t border-stone-100 pt-4">
            <Link
              href="/products"
              onClick={onClose}
              className={`flex items-center gap-2 rounded-xl border ${accent.border200} px-3 py-2 text-sm font-semibold ${accent.text700} transition-colors ${accent.hoverBg500} hover:text-white`}
            >
              {t("viewAll")} <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Right — Tab content */}
        <div className="p-5">
          {/* ── Categories tab ── */}
          {activeTab === "categories" && (
            <>
              <p className="mb-3 text-xs font-bold tracking-widest text-stone-400 uppercase">
                {t("shopByCategory")}
              </p>
              <div className="grid max-h-[340px] grid-cols-2 gap-0.5 overflow-y-auto">
                {categories.length === 0 ? (
                  <div className="col-span-2 flex h-20 items-center justify-center text-sm text-stone-400">
                    {t("loadingCategories")}
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
              <p className="mb-4 text-xs font-bold tracking-widest text-stone-400 uppercase">
                {t("shopByOrigin")}
              </p>
              <div className="flex flex-col gap-3">
                {/* Made in India */}
                <Link
                  href="/products?origin=made-in-india"
                  onClick={onClose}
                  className={`group flex items-center gap-4 rounded-2xl border border-stone-100 p-4 transition-all ${accent.hoverBorder200} ${accent.hoverBg50}`}
                >
                  <div className="flex h-12 w-15 ">
                    <img src="https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/250px-Flag_of_India.svg.png" alt="indian flag" />
                  </div>
                  <div>
                    <p className={`font-bold text-stone-800 transition-colors ${accent.groupHoverText700}`}>
                      {t("madeInIndia")}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {t("madeInIndiaDesc")}
                    </p>
                  </div>
                </Link>

                {/* Foreign Made */}
                {/* <Link
                  href="/products?origin=foreign-made"
                  onClick={onClose}
                  className={`group flex items-center gap-4 rounded-2xl border border-stone-100 p-4 transition-all ${accent.hoverBorder200} ${accent.hoverBg50}`}
                >
                  <div className="flex h-12 w-15 ">
                    <img src="https://www.jegroupllc.com/wp-content/uploads/2019/03/globe.png" alt="international" />
                  </div>
                  <div>
                    <p className={`font-bold text-stone-800 transition-colors ${accent.groupHoverText700}`}>
                      International Products
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      Imported &amp; foreign-made goods
                    </p>
                  </div>
                </Link> */}

                {/* All Products */}
                <Link
                  href="/products"
                  onClick={onClose}
                  className={`group flex items-center gap-4 rounded-2xl border border-stone-100 p-4 transition-all ${accent.hoverBorder200} ${accent.hoverBg50}`}
                >

                  <div className="flex h-12 w-15 ">
                    <img src="https://png.pngtree.com/png-clipart/20210606/original/pngtree-3d-beauty-cosmetics-product-design-png-image_6391024.jpg" alt="international" />
                  </div>

                  <div>
                    <p className={`font-bold text-stone-800 transition-colors ${accent.groupHoverText700}`}>
                      {t("allProducts")}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {t("allProductsDesc")}
                    </p>
                  </div>
                </Link>
              </div>
            </>
          )}

          {/* ── Sellers tab ── */}
          {activeTab === "sellers" && (
            <>
              <p className="mb-3 text-xs font-bold tracking-widest text-stone-400 uppercase">
                {t("shopBySeller")}
              </p>
              {shops.length === 0 ? (
                <div className="flex h-20 items-center justify-center text-sm text-stone-400">
                  {t("loadingShops")}
                </div>
              ) : (
                <div className="grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto">
                  {shops.map((shop) => (
                    <Link
                      key={shop._id}
                      href={`/shop/${shop.slug}`}
                      onClick={onClose}
                      className={`group flex items-center gap-3 rounded-xl border border-stone-100 p-3 transition-all ${accent.hoverBorder200} ${accent.hoverBg50}`}
                    >
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg ${accent.bg100} transition-colors ${accent.groupHoverBg200}`}
                      >
                        {shop.logo ? (
                          <img
                            src={shop.logo}
                            alt={shop.shopName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className={`text-sm font-bold uppercase ${accent.text600}`}>
                            {shop.shopName.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`line-clamp-2 text-sm leading-snug font-medium text-stone-700 transition-colors ${accent.groupHoverText700}`}
                      >
                        {shop.shopName}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 border-t border-stone-100 pt-4">
                <Link
                  href="/sellers"
                  onClick={onClose}
                  className={`inline-flex items-center gap-2 rounded-xl border ${accent.border200} px-3 py-2 text-sm font-semibold ${accent.text700} transition-colors ${accent.hoverBg500} hover:text-white`}
                >
                  <Store size={14} /> {t("viewAllSellers")}{" "}
                  <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────── */
export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Header");

  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const hasFetchedCategories = useRef(false);
  const hasFetchedShops = useRef(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (hasFetchedCategories.current) return;
    hasFetchedCategories.current = true;
    fetch("/api/categories?flat=true")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Fetch shops lazily when menu opens
  useEffect(() => {
    if (!productsMenuOpen || hasFetchedShops.current) return;
    hasFetchedShops.current = true;
    fetch("/api/shops?limit=20")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.shops) ? data.shops : [];
        setShops(list);
      })
      .catch(() => {});
  }, [productsMenuOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProductsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setProductsMenuOpen(false);
  }, [pathname]);

  if (!mounted) return null;
  if (pathname?.startsWith("/admin")) return null;

  const isVendor = session?.user?.role === "shop_owner";
  const isAdmin = session?.user?.role === "admin";
  const isLoggedIn = !!session?.user;

  const navLinks = [
    { href: "/blog", label: t("blog") },
    { href: "/about-us", label: t("aboutUs") },
    { href: "/contact-us", label: t("contact") },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-stone-100 bg-white/95 shadow-sm backdrop-blur-md"
          : "border-b border-stone-100 bg-white"
      }`}
    >
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-r ${accent.bar} ${IS_INDIA ? "h-0.5" : "h-1.5"}`}
      >
        {!IS_INDIA && <MashrabiyaPattern className="text-white" opacity={0.35} />}
      </div>

      <div className="mx-auto max-w-7xl px-4 h-20 sm:px-6">
        <div className="flex h-18  items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => router.push("/")}
            className="group flex shrink-0 items-center gap-2.5 focus:outline-none"
            aria-label={t("goToHome")}
          >

            <div
              className={`relative h-22 w-35 mt-4 px-2 overflow-hidden rounded-[50%] bg-white transition-all duration-200 ${accent.ring400}`}
            >
              <Image
                src={LinkAndSmileLogo}
                alt="LinkAndSmile"
                fill
                className="object-cover"
                priority
              />
            </div>
         
          </button>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {/* Products mega menu trigger */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProductsMenuOpen((v) => !v)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  pathname?.startsWith("/products") || productsMenuOpen
                    ? `${accent.bg50} ${accent.text700}`
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                {t("products")}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${productsMenuOpen ? "rotate-180" : ""}`}
                />
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
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  pathname === href
                    ? `${accent.bg50} ${accent.text700}`
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                {label}
              </Link>
            ))}

            {/* Sell with us — hidden for vendors & admins */}
            {!isVendor && !isAdmin && (
              <Link
                href="/register-as-seller"
                className={`ms-2 rounded-lg border ${accent.border200} ${accent.bg50} px-3 py-1.5 text-sm font-medium ${accent.text700} transition-all duration-150 ${IS_INDIA ? "hover:bg-amber-100" : "hover:bg-gold-100"}`}
              >
                {t("sellWithUs")}
              </Link>
            )}

            {/* Dashboard shortcut for vendors & admins */}
            {(isVendor || isAdmin) && (
              <Link
                href={isAdmin ? "/admin" : "/vendor"}
                className={`ms-2 flex items-center gap-1.5 rounded-lg border ${accent.border200} ${accent.bg50} px-3 py-1.5 text-sm font-medium ${accent.text700} transition-all duration-150 ${IS_INDIA ? "hover:bg-amber-100" : "hover:bg-gold-100"}`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                {t("dashboard")}
              </Link>
            )}

            <LocaleSwitcher />
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {isLoggedIn && <CartIcon />}

            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex h-9 items-center gap-2 rounded-xl px-2 hover:bg-stone-50 sm:px-3"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${accent.bg100}`}
                    >
                      <User className={`h-3.5 w-3.5 ${accent.text700}`} />
                    </div>
                    <span className="hidden max-w-[100px] truncate text-sm font-medium text-stone-700 sm:inline">
                      {session.user.name?.split(" ")[0] || t("account")}
                    </span>
                    <ChevronDown className="h-3 w-3 text-stone-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-xl border border-stone-100 p-1 shadow-lg"
                >
                  <div className="mb-1 px-3 py-2">
                    <p className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                      {t("account")}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-stone-800">
                      {session.user.name || session.user.email}
                    </p>
                  </div>
                  <div className="mb-1 h-px bg-stone-100" />

                  {/* Mobile nav links */}
                  <div className="md:hidden">
                    <DropdownMenuItem asChild>
                      <Link href="/products" className="cursor-pointer rounded-lg text-sm">
                        {t("products")}
                      </Link>
                    </DropdownMenuItem>
                    {navLinks.map(({ href, label }) => (
                      <DropdownMenuItem key={href} asChild>
                        <Link href={href} className="cursor-pointer rounded-lg text-sm">
                          {label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <div className="my-1 h-px bg-stone-100" />
                    <div className="px-1">
                      <LocaleSwitcher />
                    </div>
                    <div className="my-1 h-px bg-stone-100" />
                  </div>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex cursor-pointer items-center gap-2 rounded-lg text-sm"
                    >
                      <User className="h-4 w-4 text-stone-400" /> {t("myProfile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile/orders"
                      className="flex cursor-pointer items-center gap-2 rounded-lg text-sm"
                    >
                      <ShoppingBag className="h-4 w-4 text-stone-400" /> {t("myOrders")}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        className="flex cursor-pointer items-center gap-2 rounded-lg text-sm"
                      >
                        <LayoutDashboard className="h-4 w-4 text-stone-400" /> {t("adminDashboard")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isVendor && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/vendor"
                        className="flex cursor-pointer items-center gap-2 rounded-lg text-sm"
                      >
                        <LayoutDashboard className="h-4 w-4 text-stone-400" /> {t("vendorDashboard")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <div className="my-1 h-px bg-stone-100" />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex cursor-pointer items-center gap-2 rounded-lg text-sm text-red-500 focus:bg-red-50 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4" /> {t("signOut")}
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
                    <DropdownMenuContent
                      align="end"
                      className="w-52 rounded-xl border border-stone-100 p-1"
                    >
                      <DropdownMenuItem asChild>
                        <Link href="/products" className="cursor-pointer rounded-lg text-sm">
                          {t("products")}
                        </Link>
                      </DropdownMenuItem>
                      {navLinks.map(({ href, label }) => (
                        <DropdownMenuItem key={href} asChild>
                          <Link href={href} className="cursor-pointer rounded-lg text-sm">
                            {label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <div className="my-1 h-px bg-stone-100" />
                      <div className="px-1">
                        <LocaleSwitcher />
                      </div>
                      <div className="my-1 h-px bg-stone-100" />
                      <DropdownMenuItem
                        onClick={() => router.push("/auth/login")}
                        className="cursor-pointer rounded-lg text-sm"
                      >
                        {t("signIn")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button
                  onClick={() => router.push("/auth/login")}
                  size="sm"
                  className="hidden h-9 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 md:flex"
                >
                  {t("signIn")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
