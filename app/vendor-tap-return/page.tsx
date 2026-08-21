// app/vendor-tap-return/page.tsx
//
// Deliberately NOT nested under app/vendor/ (i.e. not app/vendor/tap-return)
// — VendorLayout renders a full-screen "Access Suspended" block instead of
// children whenever subscription.isBlocked is true, which is exactly the
// state a vendor renewing from the blocked screen is in. Nesting this page
// under that layout would make the return page unreachable for the vendors
// who need it most, so it lives at the top level instead.
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VendorTapReturnContent() {
  const searchParams = useSearchParams();
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
        const res = await fetch("/api/vendor/subscription/tap/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tapId }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setState("success");
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
            <h1 className="text-lg font-bold text-stone-900">Subscription renewed</h1>
            <p className="mt-2 text-sm text-stone-500">Your vendor account is active again.</p>
            <Link
              href="/vendor"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-bold text-white hover:bg-amber-500"
            >
              Go to Vendor Dashboard
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h1 className="text-lg font-bold text-stone-900">Payment verification failed</h1>
            <p className="mt-2 text-sm text-stone-500">{error}</p>
            <Link
              href="/vendor"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-bold text-white hover:bg-amber-500"
            >
              Back to Vendor Dashboard
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VendorTapReturnPage() {
  return (
    <Suspense fallback={null}>
      <VendorTapReturnContent />
    </Suspense>
  );
}
