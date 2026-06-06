"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/lib/store/cart-store";

export function CartSync() {
  const { data: session, status } = useSession();
  const { items, items_version, setInitialItems, clearCart } = useCartStore();
  const initialFetchDone = useRef(false);
  const lastSyncedVersion = useRef(-1);
  const prevStatus = useRef<string | null>(null);

  const syncToDB = async (currentItems: any[]) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: currentItems }),
      });
      if (res.ok) {
        lastSyncedVersion.current = items_version;
      }
    } catch (error) {
      console.error("Cart sync error:", error);
    }
  };

  // 1. On logout: clear local cart
  useEffect(() => {
    if (prevStatus.current === "authenticated" && status === "unauthenticated") {
      clearCart();
      initialFetchDone.current = false;
      lastSyncedVersion.current = -1;
    }
    prevStatus.current = status;
  }, [status, clearCart]);

  // 2. Initial load: fetch cart from DB when logged in
  useEffect(() => {
    if (status === "authenticated" && !initialFetchDone.current) {
      const fetchCart = async () => {
        try {
          const res = await fetch("/api/cart");
          if (res.ok) {
            const data = await res.json();
            if (data.cart?.items?.length > 0) {
              // DB has items — load them
              setInitialItems(data.cart.items);
              lastSyncedVersion.current = items_version + 1;
            } else if (items.length > 0) {
              // DB empty but local has items — sync local to DB
              await syncToDB(items);
            } else {
              // Both empty
              lastSyncedVersion.current = items_version + 1;
            }
            initialFetchDone.current = true;
          }
        } catch (error) {
          console.error("Cart fetch error:", error);
        }
      };
      fetchCart();
    }
  }, [status, setInitialItems, clearCart]);

  // 3. Sync to DB whenever items change
  useEffect(() => {
    if (
      status === "authenticated" &&
      initialFetchDone.current &&
      items_version > lastSyncedVersion.current
    ) {
      const timeoutId = setTimeout(() => {
        syncToDB(items);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [items, items_version, status]);

  return null;
}