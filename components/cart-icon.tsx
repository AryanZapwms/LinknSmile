"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function CartIcon() {
  const router = useRouter();
  const t = useTranslations("CartIcon");

  // mounted prevents server/client mismatch for UI that depends on client-only storage
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // read total items from your client store (may read localStorage/persisted data on client)
  const totalItems = useCartStore((state) => state.getTotalItems());

  // If you want to still avoid rendering the number until mounted:
  const showBadge = mounted && totalItems > 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative cursor-pointer"
      onClick={() => router.push("/cart")}
      aria-label={t("openCartAriaLabel")}
    >
      <ShoppingCart className="h-5 w-5" />
      {showBadge && (
        <span
          className="bg-destructive absolute -top-2 -end-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
          aria-live="polite"
        >
          {totalItems}
        </span>
      )}
    </Button>
  );
}
