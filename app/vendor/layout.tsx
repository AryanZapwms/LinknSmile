// app/vendor/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Star,
  Settings,
  Menu,
  LogOut,
  Store,
  Bell,
  Wallet,
  CreditCard,
  AlertTriangle,
  Lock,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCALE } from "@/lib/currency";
import { ACTIVE_GATEWAY } from "@/lib/payments/types";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscriptionState {
  status: "no_subscription" | "active" | "grace_period" | "blocked";
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  isInGracePeriod: boolean;
  isBlocked: boolean;
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("VendorLayout");
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { supportEmail } = usePlatformSettings();

  // 1️⃣ Hooks always declared first
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [renewing, setRenewing] = useState(false);

  const checkStatus = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/vendor/status");
      const data = await res.json();
      if (data.success) {
        setIsApproved(data.isApproved);
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Failed to check shop status:", error);
    }
  };

  // 2️⃣ Fetch shop approval + subscription status
  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // 3️⃣ Handle redirect safely after hooks
  useEffect(() => {
    if (status !== "loading" && (!session || session.user.role !== "shop_owner")) {
      router.push("/auth/login");
    }
  }, [status, session, router]);

  // 4️⃣ Load Razorpay checkout script for the renew flow
  useEffect(() => {
    if (ACTIVE_GATEWAY !== "razorpay") return;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
    return () => {
      try {
        document.body.removeChild(s);
      } catch {}
    };
  }, []);

  const handleRenew = async () => {
    setRenewing(true);

    if (ACTIVE_GATEWAY === "tap") {
      // Full-page redirect — the browser navigates away entirely, so
      // there's no in-page handler here. app/vendor-tap-return picks up
      // the return leg once Tap sends the browser back with ?tap_id=.
      try {
        const orderRes = await fetch("/api/vendor/subscription/tap/create-order", { method: "POST" });
        const order = await orderRes.json();
        if (!orderRes.ok || !order.redirectUrl) {
          throw new Error(order.error || t("renewalFailedGeneric"));
        }
        window.location.href = order.redirectUrl;
      } catch (err) {
        alert(err instanceof Error ? err.message : t("renewalFailedGeneric"));
        setRenewing(false);
      }
      return;
    }

    try {
      const orderRes = await fetch("/api/vendor/subscription/create-order", { method: "POST" });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || t("renewalFailedGeneric"));

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: "Linknsmile",
        description: "Vendor Annual Subscription",
        handler: async (response: any) => {
          try {
            const vRes = await fetch("/api/vendor/subscription/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const vData = await vRes.json();
            if (vRes.ok && vData.success) {
              await checkStatus();
            } else {
              alert(t("paymentVerificationFailedContact", { email: supportEmail }));
            }
          } catch {
            alert(t("paymentVerificationFailedRetry"));
          } finally {
            setRenewing(false);
          }
        },
        modal: {
          ondismiss: () => setRenewing(false),
        },
        prefill: { email: session?.user?.email, name: session?.user?.name },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("renewalFailedGeneric"));
      setRenewing(false);
    }
  };

  // 5️⃣ Render loading state
  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  // Hard block — more than 7 days past expiry (or cancelled, or never subscribed).
  // No sidebar, no nav, nothing else reachable except renewal.
  if (subscription?.isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Lock className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">{t("accessSuspendedTitle")}</h1>
          <p className="mt-2 text-sm text-stone-500">
            {subscription.status === "no_subscription"
              ? t("noSubscriptionMsg")
              : t("expiredMsg", {
                  date: subscription.expiryDate
                    ? new Date(subscription.expiryDate).toLocaleDateString(LOCALE, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "",
                })}
          </p>
          <p className="mt-1 text-xs text-stone-400">{t("productsRemainMsg")}</p>
          <Button className="mt-6 w-full" onClick={handleRenew} disabled={renewing}>
            {renewing ? t("processing") : t("renewSubscription")}
          </Button>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="me-2 h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </div>
    );
  }

  // Navigation items, filtered by approval
  const navigation = [
    { name: t("dashboard"), href: "/vendor", icon: LayoutDashboard },
    { name: t("products"), href: "/vendor/products", icon: Package, requiresApproval: true },
    { name: t("coupons"), href: "/vendor/coupons", icon: Tag, requiresApproval: true },
    { name: t("orders"), href: "/vendor/orders", icon: ShoppingCart, requiresApproval: true },
    { name: t("wallet"), href: "/vendor/wallet", icon: Wallet },
    { name: t("reviews"), href: "/vendor/reviews", icon: Star, requiresApproval: true },
    { name: t("bankDetails"), href: "/vendor/bank-details", icon: CreditCard },
    { name: t("settings"), href: "/vendor/settings", icon: Settings },
  ].filter((item) => !item.requiresApproval || isApproved);

  const isActive = (path: string) =>
    path === "/vendor" ? pathname === path : pathname.startsWith(path);

  const Sidebar = () => (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-16 lg:px-6">
        <Link href="/vendor" className="flex items-center gap-2 font-semibold">
          <Store className="h-6 w-6" />
          <span className="text-lg">{t("vendorPanel")}</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start gap-1 px-2 py-4 text-sm font-medium lg:px-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t p-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <div className="bg-muted/40 hidden border-r md:block">
        <Sidebar />
      </div>

      <div className="flex flex-col">
        {/* Header */}
        <header className="bg-muted/40 flex h-14 items-center gap-4 border-b px-4 lg:h-16 lg:px-6">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("toggleNav")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold md:hidden">{t("vendorDashboardMobile")}</h1>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-0 end-0 h-2 w-2 rounded-full bg-red-500"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase() || "V"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">{session.user.name}</p>
                    <p className="text-muted-foreground text-xs leading-none">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/vendor/settings">
                    <Settings className="me-2 h-4 w-4" />
                    {t("settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Store className="me-2 h-4 w-4" />
                    {t("viewStorefront")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="me-2 h-4 w-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Grace-period banner */}
        {subscription?.isInGracePeriod && (
          <div className="flex flex-col items-start justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm sm:flex-row sm:items-center lg:px-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {t("gracePeriodMsg", {
                  date: subscription.expiryDate
                    ? new Date(subscription.expiryDate).toLocaleDateString(LOCALE, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "",
                  days:
                    subscription.daysUntilExpiry !== null ? 7 + subscription.daysUntilExpiry : 7,
                })}
              </span>
            </div>
            <Button size="sm" onClick={handleRenew} disabled={renewing} className="shrink-0">
              {renewing ? t("processing") : t("renewNow")}
            </Button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
