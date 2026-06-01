"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useFavouritesStore } from "./useFavourites"

export function useFavouritesLoader() {
  const { data: session } = useSession()
  const { setFavourites, loaded } = useFavouritesStore()

  useEffect(() => {
    if (!session?.user || loaded) return
    fetch("/api/favourites")
      .then((r) => r.json())
      .then((data) => setFavourites(Array.isArray(data) ? data : []))
      .catch(() => setFavourites([]))
  }, [session, loaded])
}