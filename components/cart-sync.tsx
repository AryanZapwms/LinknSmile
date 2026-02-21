"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/lib/store/cart-store"

export function CartSync() {
  const { data: session, status } = useSession()
  const { items, items_version, setInitialItems, clearCart } = useCartStore()
  const initialFetchDone = useRef(false)
  const lastSyncedVersion = useRef(-1)
  const prevStatus = useRef<string | null>(null)

  // 1. On logout: clear local cart so items don't persist across sessions
  useEffect(() => {
    if (prevStatus.current === "authenticated" && status === "unauthenticated") {
      // User just logged out — wipe the local (localStorage) cart
      clearCart()
      initialFetchDone.current = false
      lastSyncedVersion.current = -1
    }
    prevStatus.current = status
  }, [status, clearCart])

  // 2. Initial Load: Fetch cart from DB when logged in
  useEffect(() => {
    if (status === "authenticated" && !initialFetchDone.current) {
      const fetchCart = async () => {
        try {
          const res = await fetch("/api/cart")
          if (res.ok) {
            const data = await res.json()
            if (data.cart && data.cart.items && data.cart.items.length > 0) {
              setInitialItems(data.cart.items)
              lastSyncedVersion.current = items_version + 1 // mark as synced
            } else {
              // DB cart is empty — clear local too (handles post-checkout reload)
              clearCart()
              lastSyncedVersion.current = items_version + 1
            }
            initialFetchDone.current = true
          }
        } catch (error) {
          console.error("Cart fetch error:", error)
        }
      }
      fetchCart()
    }
  }, [status, setInitialItems, clearCart])

  // 3. Sync to DB whenever items change and user is logged in
  useEffect(() => {
    if (status === "authenticated" && initialFetchDone.current && items_version > lastSyncedVersion.current) {
      const timeoutId = setTimeout(() => {
        syncToDB(items)
      }, 500) // debounce
      return () => clearTimeout(timeoutId)
    }
  }, [items, items_version, status])

  const syncToDB = async (currentItems: any[]) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: currentItems }),
      })
      if (res.ok) {
        lastSyncedVersion.current = items_version
      }
    } catch (error) {
      console.error("Cart sync error:", error)
    }
  }

  return null // This component doesn't render anything
}
