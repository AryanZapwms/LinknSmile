// components/product-card.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Eye, Phone, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductQuickView } from "./product-quick-view";
import FavouriteButton from "@/components/FavouriteButton";

interface Size {
  size: string;
  unit: "ml" | "l" | "g" | "kg";
  quantity: number;
  price: number;
  discountPrice?: number;
  stock: number;
}

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image?: string;
  slug: string;
  size?: "sm" | "md";
  hasMultipleSizes?: boolean;
  sizes?: Size[];
  stock?: number;
  shopId?: string;
  shopName?: string;
  commissionRate?: number;
}

export function ProductCard({
  id,
  name,
  price,
  discountPrice,
  image,
  slug,
  size = "sm",
  hasMultipleSizes = false,
  sizes = [],
  stock = 999,
  shopId,
  shopName,
  commissionRate,
}: ProductCardProps) {
  const { toast } = useToast();
  const { data: session } = useSession();
  const addItem = useCartStore((s) => s.addItem);
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const router = useRouter();

  const discount = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0;
  const displayPrice =
    hasMultipleSizes && sizes.length > 0
      ? Math.min(...sizes.map((s) => s.discountPrice || s.price))
      : discountPrice || price;

  const isOutOfStock = hasMultipleSizes ? sizes.every((s) => s.stock < 3) : stock < 3;

  const hasImage = Boolean(image);
  const showFallback = !hasImage || imgError;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add products to your cart.",
        variant: "destructive",
      });
      router.push("/auth/login");
      return;
    }

    if (getTotalItems() >= 5) {
      setShowBulkOrderModal(true);
      return;
    }

    if (hasMultipleSizes && sizes.length > 0 && !selectedSize) {
      toast({
        title: "Size required",
        description: "Please select a size before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    if (hasMultipleSizes && sizes.length > 0 && selectedSize) {
      addItem({
        productId: id,
        name,
        price: selectedSize.price,
        discountPrice: selectedSize.discountPrice,
        image,
        quantity: 1,
        slug,
        stock: selectedSize.stock,
        selectedSize,
        shopId: (shopId || "default") as string,
        shopName: shopName || "LinkAndSmile",
        commissionRate: commissionRate || 10,
      });
      toast({ title: "Added to cart", description: `${name} (${selectedSize.size}) added.` });
      setSelectedSize(null);
    } else {
      addItem({
        productId: id,
        name,
        price,
        discountPrice,
        image,
        quantity: 1,
        slug,
        stock,
        shopId: shopId || "default",
        shopName: shopName || "LinkAndSmile",
        commissionRate: commissionRate || 10,
      });
      toast({ title: "Added to cart", description: `${name} added to your cart.` });
    }
  };

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white transition-all duration-300 hover:border-amber-200/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        {/* Image area */}
        <Link
          href={`/products/${id}`}
          className="relative block overflow-hidden"
          style={{ aspectRatio: "1/1" }}
        >
          {/* Warm ambient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50" />

          {hasImage && !imgError && (
            <Image
              src={image!}
              alt={name}
              fill
              className={`object-contain object-center transition-all duration-500 group-hover:scale-[1.04] ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgError(true);
                setImgLoaded(true);
              }}
              priority={false}
            />
          )}

          {/* Skeleton / fallback */}
          {(!imgLoaded || showFallback) && (
            <div className="absolute inset-0 flex items-center justify-center">
              {!imgLoaded && hasImage && !imgError ? (
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-amber-400" />
              ) : (
                <svg
                  className="h-10 w-10 text-stone-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
          )}

          {/* Discount badge — amber, not red */}
          {discount > 0 && (
            <div className="absolute top-2.5 left-2.5 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-900">
              {discount}% OFF
            </div>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <span className="rounded-full bg-stone-700 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                Out of Stock
              </span>
            </div>
          )}

          {/* Wishlist button — top right, always visible softly */}
          <FavouriteButton type="product" refId={id} className="absolute top-2.5 right-2.5 z-20" />

          {/* Hover overlay — quick view */}
          <div className="absolute inset-0 z-10 flex items-end justify-center bg-gradient-to-t from-stone-900/20 to-transparent pb-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowQuickView(true);
              }}
              className="flex translate-y-2 items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-md backdrop-blur-sm transition-colors duration-300 group-hover:translate-y-0 hover:bg-white"
            >
              <Eye className="h-3 w-3" />
              Quick view
            </button>
          </div>
        </Link>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-2.5 p-3">
          {/* Product name */}
          <Link href={`/products/${id}`} className="flex-1">
            <h3 className="line-clamp-2 text-[13px] leading-snug font-medium text-stone-700 transition-colors group-hover:text-stone-900">
              {name}
            </h3>
          </Link>

          {/* Size selector */}
          {hasMultipleSizes && sizes.length > 0 && (
            <select
              value={selectedSize ? `${selectedSize.size}-${selectedSize.quantity}` : ""}
              onChange={(e) => {
                if (!e.target.value) {
                  setSelectedSize(null);
                  return;
                }
                setSelectedSize(
                  sizes.find((s) => `${s.size}-${s.quantity}` === e.target.value) || null
                );
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-600 transition-all focus:border-amber-300 focus:ring-1 focus:ring-amber-300 focus:outline-none"
            >
              <option value="">Select size…</option>
              {sizes.map((s, i) => (
                <option key={i} value={`${s.size}-${s.quantity}`} disabled={s.stock === 0}>
                  {s.size} ({s.quantity}
                  {s.unit}) — ₹{s.discountPrice ?? s.price}
                </option>
              ))}
            </select>
          )}

          {/* Divider */}
          <div className="h-px bg-stone-100" />

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-stone-900">
                ₹{Math.round(displayPrice).toLocaleString()}
              </span>
              {(discountPrice || (hasMultipleSizes && sizes.some((s) => s.discountPrice))) && (
                <span className="text-[11px] text-stone-400 line-through">
                  ₹{price.toLocaleString()}
                </span>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || (hasMultipleSizes && sizes.length > 0 && !selectedSize)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all duration-200 ${
                isOutOfStock
                  ? "cursor-not-allowed bg-stone-100 text-stone-400"
                  : "bg-stone-900 text-white shadow-sm hover:bg-amber-500 hover:text-white hover:shadow-md active:scale-95"
              }`}
            >
              <ShoppingCart className="h-3 w-3" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Order Modal */}
      <Dialog open={showBulkOrderModal} onOpenChange={setShowBulkOrderModal}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-900">
              Need a bulk order?
            </DialogTitle>
          </DialogHeader>
          <p className="mb-4 text-sm text-stone-500">
            You've reached the 5-item cart limit. For bulk orders, contact us directly.
          </p>
          <div className="mb-4 space-y-2">
            {["+91 9820623835", "+91 9819079079"].map((num) => (
              <a
                key={num}
                href={`tel:${num.replace(/\s/g, "")}`}
                className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3 transition-colors hover:border-amber-200 hover:bg-amber-50"
              >
                <Phone className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-stone-700">{num}</span>
              </a>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setShowBulkOrderModal(false)}
            >
              Continue
            </Button>
            <Button
              className="flex-1 rounded-xl bg-stone-900 hover:bg-stone-800"
              onClick={() => {
                window.location.href = "tel:+919820623835";
              }}
            >
              Call Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick View */}
      <ProductQuickView
        open={showQuickView}
        onOpenChange={setShowQuickView}
        product={{
          id,
          name,
          price,
          discountPrice,
          image,
          slug,
          sizes,
          stock,
          shopId,
          shopName,
          commissionRate,
        }}
      />
    </>
  );
}
