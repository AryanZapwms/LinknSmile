// app/(customer)/wishlist/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

interface WishlistItem {
  _id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
}

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/wishlist");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Wishlist fetch error:", error);
      toast.error("Could not load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchWishlist();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session]);

  const removeFromWishlist = async (productId: string) => {
    try {
      const res = await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      setItems((prev) => prev.filter((item) => item.productId !== productId));
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error("Could not remove item");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">My Wishlist</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Heart className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h1 className="mb-2 text-2xl font-bold">Login to view your wishlist</h1>
        <p className="text-muted-foreground mb-6">Save your favourite items and never lose them.</p>
        <Button asChild>
          <Link href="/auth/login">Login / Sign Up</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Heart className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h1 className="mb-2 text-2xl font-bold">Your wishlist is empty</h1>
        <p className="text-muted-foreground mb-6">
          Add products you love to your wishlist and they'll appear here.
        </p>
        <Button asChild>
          <Link href="/products">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">My Wishlist</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item._id} className="group overflow-hidden">
            <Link href={`/products/${item.productId}`}>
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={item.image || "/placeholder.png"}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
            </Link>
            <CardContent className="p-4">
              <Link href={`/products/${item.productId}`}>
                <h3 className="hover:text-primary line-clamp-2 text-lg font-semibold transition-colors">
                  {item.name}
                </h3>
              </Link>
              <p className="text-primary mt-2 text-xl font-bold">₹{item.price.toFixed(2)}</p>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/products/${item.productId}`}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeFromWishlist(item.productId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
