// app/profile/favourites/page.tsx
"use client";
import { useFavouritesStore } from "@/hooks/useFavourites";
import { useEffect, useState } from "react";
import Link from "next/link";
import FavouriteButton from "@/components/FavouriteButton";

export default function FavouritesPage() {
const { favourites } = useFavouritesStore();
const loading = !useFavouritesStore((s) => s.loaded);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);


 useEffect(() => {
  const productIds = favourites.filter((f) => f.type === "product").map((f) => f.refId)
  const sellerIds  = favourites.filter((f) => f.type === "seller").map((f) => f.refId)

    console.log("All favourites:", favourites)
    console.log("Seller IDs:", sellerIds)
    console.log("Product IDs:", productIds)

  if (productIds.length > 0) {
    fetch(`/api/products?ids=${productIds.join(",")}`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : data.products ?? []))
  } else {
    setProducts([]) // clear if no favourites
  }

  if (sellerIds.length > 0) {
    fetch(`/api/shops?ids=${sellerIds.join(",")}`)
  .then((r) => r.json())
  .then((data) => setSellers(Array.isArray(data) ? data : data.shops ?? []))
  } else {
    setSellers([]) // clear if no favourites
  }
}, [favourites])

  if (loading) return <p className="p-8 text-center">Loading favourites…</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <h1 className="text-2xl font-bold">My Favourites</h1>

      {/* Favourite Sellers */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Favourite Sellers</h2>
        {sellers.length === 0 ? (
          <p className="text-gray-500 text-sm">No favourite sellers yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sellers.map((s) => (
              <div key={s._id} className="relative border rounded-xl p-4 flex flex-col items-center gap-2">
                <FavouriteButton type="seller" refId={s._id} className="absolute top-2 right-2" />
                <img src={s.logo || "https://w7.pngwing.com/pngs/274/98/png-transparent-retail-computer-icons-e-commerce-shopping-shopping-store-retail-computer-business.png"} className="w-16 h-16 object-contain" alt={s.shopName} />
<Link href={`/shop/${s.slug}`} className="font-medium text-sm hover:underline">{s.shopName}</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Favourite Products */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Favourite Products</h2>
        {products.length === 0 ? (
          <p className="text-gray-500 text-sm">No favourite products yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p._id} className="relative border rounded-xl overflow-hidden">
                <FavouriteButton type="product" refId={p._id} className="absolute top-2 right-2 bg-white/80 backdrop-blur" />
                <Link href={`/products/${p._id}`}>
                  <img src={p.images?.[0]} className="w-full h-40 object-cover" alt={p.name} />
                  <div className="p-3">
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-gray-600 text-sm">₹{p.price}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}