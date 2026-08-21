// app/checkout/tap-return/page.tsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart-store";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

// Where the customer's browser lands after Tap's hosted checkout page
// redirects back with ?tap_id=. Verifies the charge server-side (never
// trusts the redirect alone) via /api/tap/verify-payment, which reads the
// items/shippingAddress stashed in the charge's metadata at create-order
// time and runs them through the same fulfillPaidOrder() path Razorpay
// uses. app/api/tap/webhook covers the case where the browser never makes
// it back here at all — both are idempotent, so whichever fires first wins.
function TapReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCartStore();
  const [state, setState] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const tapId = searchParams.get("tap_id");
    if (!tapId) {
      setState("error");
      setError("Missing payment reference. If you were charged, please contact support.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/tap/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tapId }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          clearCart();
          try {
            await fetch("/api/cart", { method: "DELETE" });
          } catch {}
          setState("success");
          router.replace(`/order-success/${data.orderId}`);
        } else {
          setState("error");
          setError(data.error || "Payment verification failed.");
        }
      } catch {
        setState("error");
        setError("Payment verification failed. Please contact support.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        {state === "verifying" && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-amber-500" />
            <h1 className="text-lg font-bold text-stone-900">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-stone-500">Please don't close or refresh this page.</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-green-500" />
            <h1 className="text-lg font-bold text-stone-900">Payment confirmed</h1>
            <p className="mt-2 text-sm text-stone-500">Redirecting to your order…</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h1 className="text-lg font-bold text-stone-900">Payment verification failed</h1>
            <p className="mt-2 text-sm text-stone-500">{error}</p>
            <Link
              href="/cart"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-bold text-white hover:bg-amber-500"
            >
              Return to Cart
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function TapReturnPage() {
  return (
    <Suspense fallback={null}>
      <TapReturnContent />
    </Suspense>
  );
}
