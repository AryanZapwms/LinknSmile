// hooks/usePlatformSettings.ts
//
// Shared client-side cache for GET /api/platform-settings/public. Several
// unrelated Client Components (footer, contact/about pages, bulk-order
// modals, product-card instances — of which there can be dozens per page)
// all need the same support email/phone/tagline; without a shared cache
// each one would independently re-fetch on mount. Zustand, matching the
// existing cart/favourites store convention (see PROJECT_SOURCE_OF_TRUTH.md
// §14) rather than introducing a new state-management pattern.
"use client";
import { useEffect } from "react";
import { create } from "zustand";

export interface PlatformSettingsPublic {
  supportEmail: string;
  supportPhone: string;
  brandTagline: string;
  // Display-only preview value for cart/checkout — the real charge is
  // always recomputed server-side via computeOrderPricing, never trusted
  // from this. See PROJECT_SOURCE_OF_TRUTH.md §4.17.
  taxRatePercent: number;
}

const DEFAULTS: PlatformSettingsPublic = {
  supportEmail: "support@linknsmile.com",
  supportPhone: "+91 8355991099",
  brandTagline: "Net & Work Builds Up Net-Worth",
  taxRatePercent: 0,
};

interface PlatformSettingsStore {
  settings: PlatformSettingsPublic;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
}

const usePlatformSettingsStore = create<PlatformSettingsStore>((set, get) => ({
  settings: DEFAULTS,
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/platform-settings/public");
      if (res.ok) {
        const data = await res.json();
        set({ settings: { ...DEFAULTS, ...data } });
      }
    } catch {
      // Keep defaults on failure — every consumer already renders something
      // sensible from DEFAULTS, so a failed fetch is a silent no-op, not a
      // broken page.
    } finally {
      set({ loaded: true, loading: false });
    }
  },
}));

/** Support email/phone/tagline/tax rate, fetched once and shared across every consumer. */
export function usePlatformSettings(): PlatformSettingsPublic {
  const settings = usePlatformSettingsStore((s) => s.settings);
  const loaded = usePlatformSettingsStore((s) => s.loaded);
  const load = usePlatformSettingsStore((s) => s.load);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return settings;
}
