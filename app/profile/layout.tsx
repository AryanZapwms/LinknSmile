// app/profile/layout.tsx
"use client";

import type React from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { User, ShoppingBag, Heart, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/profile", label: "Profile Settings", icon: User },
  { href: "/profile/orders", label: "My Orders", icon: ShoppingBag },
  { href: "/profile/favourites", label: "My Favourites", icon: Heart },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Sidebar */}
          <aside className="w-full shrink-0 md:w-56">
            <div className="sticky top-24 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm">
              {/* User badge */}
              <div className="mb-2 border-b border-stone-100 px-3 py-3">
                <p className="text-xs font-medium tracking-wider text-stone-400 uppercase">
                  Account
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-stone-800">
                  {session?.user?.name || session?.user?.email}
                </p>
              </div>

              {/* Nav links */}
              <nav className="mt-1 flex flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  // exact match for /profile, prefix match for sub-routes
                  const isActive =
                    href === "/profile" ? pathname === "/profile" : pathname?.startsWith(href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "border border-amber-200/60 bg-amber-50 text-amber-700"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-amber-600" : "text-stone-400"
                        )}
                      />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Page content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
