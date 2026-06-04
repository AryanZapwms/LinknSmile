// app/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/lib/store/cart-store";
import { CheckoutForm } from "@/components/checkout-form";
import { trackInitiateCheckout } from "@/lib/facebook-pixel";
import { Store, ShoppingBag, ChevronRight, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
          <p className="mt-0.5 text-xs text-stone-400">Please don't close or refresh the page.</p>
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
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, getTotalPrice, clearCart, getItemsByVendor, getCommissionBreakdown } =
    useCartStore();

  const [isLoading, setIsLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  const itemsByVendor = getItemsByVendor();
  const breakdown = getCommissionBreakdown();
  const totalPrice = getTotalPrice();
  const multiVendor = Object.keys(itemsByVendor).length > 1;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login");
  }, [status, router]);

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
          fetch("/api/admin/payment-settings"),
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
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        clearCart();
        await clearServerCart();
        router.push(`/order-success/${data.orderId}`);
        return;
      }

      if (paymentMethod === "razorpay") {
        const rpRes = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: totalPrice }),
        });
        const rpOrder = await rpRes.json();
        if (!rpRes.ok) throw new Error(rpOrder.error || "Failed to create order");

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: rpOrder.id,
          amount: rpOrder.amount,
          currency: rpOrder.currency,
          name: "LinkAndSmile",
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
                }),
              });
              const vData = await vRes.json();
              if (vRes.ok && vData.orderId) {
                clearCart();
                await clearServerCart();
                router.push(`/order-success/${vData.orderId}`);
              } else {
                alert("Payment verification failed. Please contact support.");
              }
            } catch {
              alert("Payment verification failed. Please try again.");
            } finally {
              setIsLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              alert("Payment cancelled.");
              setIsLoading(false);
            },
          },
          prefill: { email: session?.user?.email, name: session?.user?.name },
        };
        new window.Razorpay(options).open();
      }
    } catch (err) {
      alert(`Checkout failed: ${err instanceof Error ? err.message : "Please try again."}`);
      setIsLoading(false);
    }
  };

  const availablePaymentMethods = (): string[] => {
    if (!paymentSettings) return ["razorpay"];
    const m: string[] = [];
    if (paymentSettings.enableRazorpay) m.push("razorpay");
    if (paymentSettings.enableCOD) m.push("cod");
    return m.length > 0 ? m : ["razorpay"];
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <CheckoutSkeleton />
      </main>
    );
  }
  if (status === "unauthenticated") return null;

  return (
    <main className="min-h-screen bg-stone-50">
      <TopProgressBar visible={isLoading} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-stone-400">
            <Link href="/" className="transition-colors hover:text-stone-600">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/cart" className="transition-colors hover:text-stone-600">
              Cart
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-stone-600">Checkout</span>
          </nav>
          <p className="mb-1 text-xs font-semibold tracking-widest text-amber-600 uppercase">
            Almost there
          </p>
          <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">Checkout</h1>
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
                    Items from {Object.keys(itemsByVendor).length} Sellers
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
                              {vendorItems[0]?.shopName || "LinkAndSmile"}
                            </span>
                          </div>
                          <span className="rounded-full border border-stone-100 bg-white px-2.5 py-1 text-xs text-stone-400">
                            {vendorItems.length} item{vendorItems.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="mb-3 space-y-1.5">
                          {vendorItems.map((item) => (
                            <div key={item.productId} className="flex justify-between text-xs">
                              <span className="text-stone-500">
                                {item.name} × {item.quantity}
                              </span>
                              <span className="font-medium text-stone-700">
                                ₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {vInfo && (
                          <div className="space-y-1 border-t border-stone-200 pt-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-stone-400">Subtotal</span>
                              <span className="font-semibold text-stone-700">
                                ₹{vInfo.subtotal.toFixed(2)}
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
              totalAmount={totalPrice}
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
                <h2 className="text-sm font-bold text-stone-900">Order Summary</h2>
                <span className="ml-auto text-xs text-stone-400">
                  {items.length} item{items.length !== 1 ? "s" : ""}
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
                        ₹
                        {Math.round(
                          (item.discountPrice || item.price) * item.quantity
                        ).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-stone-400">×{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 border-t border-stone-100 px-5 pt-4 pb-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Subtotal</span>
                    <span className="font-semibold text-stone-800">
                      ₹{Math.round(totalPrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Tax</span>
                    <span className="font-semibold text-stone-800">Included</span>
                  </div>
                </div>

                <div className="h-px bg-stone-100" />

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-stone-900">Total</span>
                  <span className="text-xl font-black text-stone-900">
                    ₹{Math.round(totalPrice).toLocaleString()}
                  </span>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { icon: "🔒", label: "Secure Checkout" },
                    { icon: "🚚", label: "Free Delivery" },
                    { icon: "↩️", label: "Easy Returns" },
                    { icon: "✅", label: "Verified Sellers" },
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

      {isLoading && <FullPageLoader message="Processing your payment…" />}
    </main>
  );
}
