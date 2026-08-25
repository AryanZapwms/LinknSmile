// app/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/lib/store/cart-store";
import { CheckoutForm } from "@/components/checkout-form";
import { trackInitiateCheckout } from "@/lib/facebook-pixel";
import { Store, ShoppingBag, ChevronRight, Package, Tag, X, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { ACTIVE_GATEWAY } from "@/lib/payments/types";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentSettings {
  enableCOD: boolean;
  enableRazorpay: boolean;
}

/* ─── Progress bar ───────── */
function TopProgressBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-0 right-0 left-0 z-50 h-0.5 overflow-hidden bg-stone-100">
      <div className="h-full animate-[progress_1.8s_ease-in-out_infinite] bg-amber-400" />
      <style>{`@keyframes progress { 0%{transform:translateX(-100%)} 60%{transform:translateX(0%)} 100%{transform:translateX(100%)} }`}</style>
    </div>
  );
}

/* ─── Full-page loader ───── */
function FullPageLoader({ message }: { message: string }) {
  const t = useTranslations("Checkout");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm">
      <div className="mx-4 flex w-full max-w-sm items-center gap-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <svg className="h-5 w-5 animate-spin text-amber-500" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">{message}</p>
          <p className="mt-0.5 text-xs text-stone-400">{t("dontClose")}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ───── */
function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6">
      <div className="mb-8 h-6 w-32 rounded-xl bg-stone-100" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="h-64 rounded-2xl bg-stone-100" />
          <div className="h-40 rounded-2xl bg-stone-100" />
        </div>
        <div className="h-80 rounded-2xl bg-stone-100" />
      </div>
    </div>
  );
}

/* ─── Main page ──────────── */
export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, getTotalPrice, clearCart, getItemsByVendor, getCommissionBreakdown } =
    useCartStore();

  const [isLoading, setIsLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(
    null
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const { taxRatePercent } = usePlatformSettings();

  const itemsByVendor = getItemsByVendor();
  const breakdown = getCommissionBreakdown();
  const totalPrice = getTotalPrice();
  const multiVendor = Object.keys(itemsByVendor).length > 1;
  const payableTotal = totalPrice - (appliedCoupon?.discountAmount || 0);
  // Preview only, same formula/inputs as the server's computeOrderPricing
  // tax step (lib/pricing.ts) — the real charge is always recomputed
  // server-side at create-order/verify-payment/orders time.
  const taxAmount = Math.round(((payableTotal * taxRatePercent) / 100) * 100) / 100;
  const grandTotal = payableTotal + taxAmount;

  const pricingItems = () =>
    items.map((i) => ({
      product: i.productId,
      quantity: i.quantity,
      selectedSize: i.selectedSize
        ? { size: i.selectedSize.size, quantity: i.selectedSize.quantity }
        : undefined,
    }));

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pricingItems(), couponCode: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedCoupon({ code: data.code, discountAmount: data.discountAmount });
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || t("invalidCoupon"));
      }
    } catch {
      setCouponError(t("couponValidateFailed"));
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && !isLoading && items.length === 0) {
      router.replace("/cart");
    }
  }, [status, isLoading, items.length, router]);

  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout(
        totalPrice,
        items.length,
        items.map((i) => i.productId)
      );
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          fetch("/api/payment-settings/public"),
          fetch("/api/users/profile"),
        ]);
        setPaymentSettings(
          settingsRes.ok ? await settingsRes.json() : { enableCOD: true, enableRazorpay: true }
        );
        if (profileRes.ok) setUserData(await profileRes.json());
      } catch {
        setPaymentSettings({ enableCOD: true, enableRazorpay: true });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

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

  const handleCheckout = async (shippingAddress: any, paymentMethod: string) => {
    setIsLoading(true);
    const clearServerCart = async () => {
      try {
        await fetch("/api/cart", { method: "DELETE" });
      } catch {}
    };

    try {
      if (paymentMethod === "cod") {
  const idempotencyKey = `cod-${session?.user?.id}-${Date.now()}`;
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
            items: items.map((i) => ({
              product: i.productId,
              quantity: i.quantity,
              price: i.discountPrice || i.price,
              selectedSize: i.selectedSize,
              shopId: i.shopId,
              shopName: i.shopName,
              commissionRate: i.commissionRate || 10,
            })),
            shippingAddress,
            totalAmount: totalPrice,
            paymentMethod: "cod",
            paymentStatus: "pending",
            couponCode: appliedCoupon?.code,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        clearCart();
        await clearServerCart();
        router.replace(`/order-success/${data.orderId}`);
        return;
      }

      

      

      if (paymentMethod === "online" && ACTIVE_GATEWAY === "razorpay") {
        const rpRes = await fetch("/api/razorpay/create-order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    items: pricingItems(),
    couponCode: appliedCoupon?.code,
  }),
});
        const rpOrder = await rpRes.json();
        if (!rpRes.ok) throw new Error(rpOrder.error || "Failed to create order");

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: rpOrder.id,
          amount: rpOrder.amount,
          currency: rpOrder.currency,
          name: "Linknsmile",
          description: "India's Marketplace",
          handler: async (response: any) => {
            try {
              const vRes = await fetch("/api/razorpay/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  items: items.map((i) => ({
                    product: i.productId,
                    quantity: i.quantity,
                    price: i.discountPrice || i.price,
                    selectedSize: i.selectedSize,
                    shopId: i.shopId,
                    shopName: i.shopName,
                    commissionRate: i.commissionRate || 10,
                  })),
                  shippingAddress,
                  totalAmount: totalPrice,
                  couponCode: appliedCoupon?.code,
                }),
              });
              const vData = await vRes.json();
              if (vRes.ok && vData.orderId) {
                clearCart();
                await clearServerCart();
                router.replace(`/order-success/${vData.orderId}`);
              } else {
                alert(t("paymentVerificationFailed"));
              }
            } catch {
              alert(t("paymentVerificationFailedRetry"));
            } finally {
              setIsLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              alert(t("paymentCancelled"));
              setIsLoading(false);
            },
          },
          prefill: { email: session?.user?.email, name: session?.user?.name },
        };
        new window.Razorpay(options).open();
        return;
      }

      if (paymentMethod === "online" && ACTIVE_GATEWAY === "tap") {
        // Tap's checkout is a full-page redirect, not a widget — the
        // browser fully navigates away, so isLoading stays true (the
        // TopProgressBar/FullPageLoader keep showing) right up until
        // navigation happens. app/checkout/tap-return handles the return
        // leg once Tap sends the browser back with ?tap_id=.
        const tapRes = await fetch("/api/tap/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: pricingItems(),
            couponCode: appliedCoupon?.code,
            shippingAddress,
          }),
        });
        const tapOrder = await tapRes.json();
        if (!tapRes.ok || !tapOrder.redirectUrl) {
          throw new Error(tapOrder.error || "Failed to start payment");
        }
        window.location.href = tapOrder.redirectUrl;
        return;
      }
    } catch (err) {
      alert(
        t("checkoutFailed", {
          message: err instanceof Error ? err.message : t("pleaseTryAgain"),
        })
      );
      setIsLoading(false);
    }
  };

  const availablePaymentMethods = (): string[] => {
    // "online" is gateway-agnostic — enableRazorpay is reused as the
    // generic "online payment enabled" flag regardless of ACTIVE_GATEWAY
    // (see PROJECT_SOURCE_OF_TRUTH.md's payment-settings note).
    if (!paymentSettings) return ["online"];
    const m: string[] = [];
    if (paymentSettings.enableRazorpay) m.push("online");
    if (paymentSettings.enableCOD) m.push("cod");
    return m.length > 0 ? m : ["online"];
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <CheckoutSkeleton />
      </main>
    );
  }
  if (status === "unauthenticated") return null;
  if (items.length === 0) return null;

  return (
    <main className="min-h-screen bg-stone-50">
      <TopProgressBar visible={isLoading} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-stone-400">
            <Link href="/" className="transition-colors hover:text-stone-600">
              {t("home")}
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <Link href="/cart" className="transition-colors hover:text-stone-600">
              {t("cart")}
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-stone-600">{t("checkout")}</span>
          </nav>
          <p className="mb-1 text-xs font-semibold tracking-widest text-amber-600 uppercase">
            {t("almostThere")}
          </p>
          <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">{t("title")}</h1>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Left: form + multi-vendor breakdown ── */}
          <div className="space-y-5">
            {/* Multi-vendor breakdown */}
            {multiVendor && (
              <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
                <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                    <Store className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <h2 className="text-sm font-bold text-stone-900">
                    {t("itemsFromSellers", { count: Object.keys(itemsByVendor).length })}
                  </h2>
                </div>
                <div className="space-y-4 p-5">
                  {Object.entries(itemsByVendor).map(([shopId, vendorItems]) => {
                    const vInfo = breakdown.byVendor?.find((v: any) => v.shopId === shopId);
                    return (
                      <div
                        key={shopId}
                        className="rounded-xl border border-stone-100 bg-stone-50 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white">
                              <Store className="h-3.5 w-3.5 text-stone-400" />
                            </div>
                            <span className="text-sm font-semibold text-stone-800">
                              {vendorItems[0]?.shopName || t("defaultShopName")}
                            </span>
                          </div>
                          <span className="rounded-full border border-stone-100 bg-white px-2.5 py-1 text-xs text-stone-400">
                            {t("itemCount", { count: vendorItems.length })}
                          </span>
                        </div>
                        <div className="mb-3 space-y-1.5">
                          {vendorItems.map((item) => (
                            <div key={item.productId} className="flex justify-between text-xs">
                              <span className="text-stone-500">
                                {item.name} × {item.quantity}
                              </span>
                              <span className="font-medium text-stone-700">
                                {formatCurrency((item.discountPrice || item.price) * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {vInfo && (
                          <div className="space-y-1 border-t border-stone-200 pt-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-stone-400">{t("subtotal")}</span>
                              <span className="font-semibold text-stone-700">
                                {formatCurrency(vInfo.subtotal)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Checkout form */}
            <CheckoutForm
              totalAmount={grandTotal}
              onSubmit={handleCheckout}
              availablePaymentMethods={availablePaymentMethods()}
              initialData={{
                name: userData?.name || session?.user?.name || "",
                phone: userData?.phone || "",
                street: userData?.address || "",
                city: userData?.city || "",
                state: userData?.state || "",
                zipCode: userData?.pincode || "",
                country: "India",
              }}
              isSubmitting={isLoading}
            />
          </div>

          {/* ── Right: order summary ── */}
          <div className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <h2 className="text-sm font-bold text-stone-900">{t("orderSummary")}</h2>
                <span className="ms-auto text-xs text-stone-400">
                  {t("itemCount", { count: items.length })}
                </span>
              </div>

              {/* Items */}
              <div className="max-h-64 space-y-3 overflow-y-auto px-5 py-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-start gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-0.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-stone-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs leading-snug font-medium text-stone-800">
                        {item.name}
                      </p>
                      {item.selectedSize && (
                        <p className="mt-0.5 text-[10px] text-stone-400">
                          {item.selectedSize.size} · {item.selectedSize.quantity}
                          {item.selectedSize.unit}
                        </p>
                      )}
                      {item.shopName && (
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400">
                          <Store className="h-2.5 w-2.5" />
                          {item.shopName}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-stone-900">
                        {formatCurrency((item.discountPrice || item.price) * item.quantity)}
                      </p>
                      <p className="text-[10px] text-stone-400">×{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="space-y-2 border-t border-stone-100 px-5 py-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-green-600" />
                      <span className="font-mono text-xs font-bold text-green-700">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-xs text-green-600">{t("couponApplied")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-green-600 hover:text-green-800"
                      aria-label={t("removeCoupon")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute top-1/2 start-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-300" />
                        <input
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          placeholder={t("couponPlaceholder")}
                          disabled={validatingCoupon}
                          className="h-9 w-full rounded-xl border-2 border-stone-200 bg-white pe-3 ps-9 font-mono text-xs uppercase placeholder:text-stone-300 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={!couponInput.trim() || validatingCoupon}
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-stone-900 px-4 text-xs font-bold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {validatingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("apply")}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                  </>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-3 border-t border-stone-100 px-5 pt-4 pb-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{t("subtotal")}</span>
                    <span className="font-semibold text-stone-800">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">{t("couponDiscount")}</span>
                      <span className="font-semibold text-green-600">
                        −{formatCurrency(appliedCoupon.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{t("shipping")}</span>
                    <span className="font-semibold text-green-600">{t("free")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">
                      {taxRatePercent > 0 ? t("taxWithRate", { rate: taxRatePercent }) : t("tax")}
                    </span>
                    <span className="font-semibold text-stone-800">
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-stone-100" />

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-stone-900">{t("total")}</span>
                  <span className="text-xl font-black text-stone-900">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { icon: "🔒", label: t("trustSecureCheckout") },
                    { icon: "🚚", label: t("trustFreeDelivery") },
                    { icon: "↩️", label: t("trustEasyReturns") },
                    { icon: "✅", label: t("trustVerifiedSellers") },
                  ].map(({ icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400"
                    >
                      <span>{icon}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <FullPageLoader message={t("processingPayment")} />}
    </main>
  );
}
