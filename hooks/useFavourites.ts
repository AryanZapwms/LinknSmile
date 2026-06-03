import { create } from "zustand";

interface Favourite {
  _id: string;
  type: "product" | "seller";
  refId: string;
}

interface FavouritesStore {
  favourites: Favourite[];
  loaded: boolean;
  setFavourites: (favs: Favourite[]) => void;
  toggle: (type: "product" | "seller", refId: string) => Promise<void>;
  isFavourite: (type: "product" | "seller", refId: string) => boolean;
}

export const useFavouritesStore = create<FavouritesStore>((set, get) => ({
  favourites: [],
  loaded: false,

  setFavourites: (favs) => set({ favourites: favs, loaded: true }),

  toggle: async (type, refId) => {
    const { favourites } = get();
    const exists = favourites.some((f) => f.type === type && f.refId === refId);

    // Optimistic update
    if (exists) {
      set({ favourites: favourites.filter((f) => !(f.type === type && f.refId === refId)) });
    } else {
      set({ favourites: [...favourites, { _id: Date.now().toString(), type, refId }] });
    }

    // Sync with server
    try {
      await fetch("/api/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, refId }),
      });
    } catch {
      // Revert on error
      set({ favourites });
    }
  },

  isFavourite: (type, refId) => get().favourites.some((f) => f.type === type && f.refId === refId),
}));
