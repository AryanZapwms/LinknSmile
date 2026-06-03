"use client";

import type React from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingCart className="h-5 w-5" /> },
  { href: "/admin/products", label: "Products", icon: <Package className="h-5 w-5" /> },
  { href: "/admin/categories", label: "Categories", icon: <Layers className="h-5 w-5" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="h-5 w-5" /> },
  { href: "/admin/promos", label: "Promo Bar", icon: <Megaphone className="h-5 w-5" /> },
  {
    href: "/admin/product-approvals",
    label: "Product Approvals",
    icon: <Package className="h-5 w-5" />,
  },
  { href: "/admin/vendors", label: "Vendors", icon: <Users className="h-5 w-5" /> },

  { href: "/admin/wallet", label: "Finance", icon: <DollarSign className="h-5 w-5" /> },
  { href: "/admin/payouts", label: "Vendor Payouts", icon: <DollarSign className="h-5 w-5" /> },
  { href: "/admin/settings", label: "Payment Settings", icon: <Settings className="h-5 w-5" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hovered, setHovered] = useState(false);

  // ✅ Mount check
  useEffect(() => {
    setMounted(true);

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login");
  }, [status, router]);

  // Prevent SSR mismatch
  if (!mounted) return null;

  if (status === "loading") {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading admin...</p>
      </main>
    );
  }

  if (!session) return null;

  const isAdmin = (session.user as any)?.role === "admin";

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF6E8] px-4">
        <Card className="w-full max-w-md rounded-2xl border border-amber-200 bg-[#FFFDF7] text-center shadow-sm">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-50">
                <SearchX className="h-10 w-10 text-purple-600" />
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
                className="h-10 w-full font-semibold"
                style={{ backgroundColor: "#7c3aed", color: "#fff" }}
                onClick={() => router.push("/")}
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isRouteActive = (href: string) => pathname === href;

  return (
    <div className="bg-background flex min-h-screen">
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`border-border bg-card fixed top-0 left-0 z-40 flex h-screen flex-col border-r transition-all duration-300 lg:sticky ${sidebarOpen || hovered ? "w-64" : "w-0 lg:w-20"} `}
        onMouseEnter={() => isDesktop && setHovered(true)}
        onMouseLeave={() => {
          isDesktop && setHovered(false);
          setSidebarOpen(false);
        }}
      >
        {/* Sidebar Header */}
        <div className="border-border border-b p-4 lg:p-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex h-8 w-14 flex-shrink-0 items-center justify-center rounded-lg">
              <span className="text-primary-foreground text-xs font-bold">Admin</span>
            </div>
            <div
              className={`overflow-hidden transition-opacity duration-300 ${
                sidebarOpen || hovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <h2 className="text-foreground text-sm font-bold">{mounted && "Admin"}</h2>
              <p className="text-muted-foreground truncate text-xs">
                {mounted && session.user?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="space-y-1 p-2 lg:p-1.5" aria-label="Admin navigation">
            {navItems.map((item) => {
              const active = isRouteActive(item.href);
              const baseClasses = `w-full gap-3 transition-all ${
                sidebarOpen || hovered ? "px-4 justify-start" : "lg:px-2 px-4 justify-center"
              }`;
              const activeClasses = active
                ? "bg-black text-white"
                : "hover:bg-black hover:text-white";

              return (
                <div key={item.href} className="overflow-hidden rounded-md">
                  <Button
                    variant="ghost"
                    className={`${baseClasses} ${activeClasses}`}
                    onClick={() => {
                      setSidebarOpen(false);
                      router.push(item.href);
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span
                      className={`overflow-hidden transition-all duration-300 ${
                        sidebarOpen || hovered ? "w-auto opacity-100" : "w-0 opacity-0"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Button>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="border-border mt-auto cursor-pointer border-t p-2">
          <Button
            variant="outline"
            className={`w-full justify-start gap-3 border-0 bg-red-600 text-white transition-all hover:bg-red-700 ${
              sidebarOpen || hovered ? "justify-start px-4" : "justify-center px-4 lg:px-2"
            }`}
            onClick={async () => {
              try {
                await signOut({ redirect: false });
              } catch (err) {
                console.error("signOut error:", err);
              } finally {
                router.push("/");
              }
            }}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span
              className={`overflow-hidden transition-all duration-300 ${
                sidebarOpen || hovered ? "w-auto opacity-100" : "w-0 opacity-0"
              }`}
            >
              Logout
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="w-full flex-1 overflow-auto p-7 pt-16 lg:pt-0">{mounted && children}</main>
    </div>
  );
}
