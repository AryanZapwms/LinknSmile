// components/product-quick-view.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Star,
  Info,
  Package,
  ShieldCheck,
  ClipboardList,
  ArrowUpRight,
  Truck,
  RotateCcw,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Size {
  size: string;
  unit: "ml" | "l" | "g" | "kg";
  quantity: number;
  price: number;
  discountPrice?: number;
  stock: number;
}

interface ProductQuickViewProps {
  product: {
    id: string;
    name: string;
    price: number;
    discountPrice?: number;
    image?: string;
    slug: string;
    description?: string;
    ingredients?: string[];
    benefits?: string[];
    usage?: string;
    suitableFor?: string[];
    sizes?: Size[];
    stock?: number;
    shopId?: string;
    shopName?: string;
    commissionRate?: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductQuickView({ product, open, onOpenChange }: ProductQuickViewProps) {
  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const [selectedSize, setSelectedSize] = useState<Size | null>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
  );
  const [fullProduct, setFullProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (open && product.id) {
      setLoading(true);
      setImgLoaded(false);
      fetch(`/api/products/${product.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setFullProduct(data);
            if (data.sizes?.length && !selectedSize) setSelectedSize(data.sizes[0]);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, product.id]);

  const p = fullProduct || product;

  const currentPrice = selectedSize?.price ?? p.price;
  const currentDiscount = selectedSize?.discountPrice ?? p.discountPrice;
  const discount = currentDiscount
    ? Math.round(((currentPrice - currentDiscount) / currentPrice) * 100)
    : 0;
  const displayPrice = currentDiscount || currentPrice;
  const isOutOfStock = selectedSize ? selectedSize.stock === 0 : (p.stock || 999) === 0;

  const handleAddToCart = () => {
    if (!session?.user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add products to your cart.",
        variant: "destructive",
      });
      onOpenChange(false);
      router.push("/auth/login");
      return;
    }
    if (getTotalItems() >= 5) {
      toast({
        title: "Cart limit reached",
        description: "Maximum 5 products. Contact us for bulk orders.",
        variant: "destructive",
      });
      return;
    }
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({
        title: "Select a size",
        description: "Please pick a size before adding to cart.",
        variant: "destructive",
      });
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: selectedSize ? selectedSize.price : product.price,
      discountPrice: selectedSize ? selectedSize.discountPrice : product.discountPrice,
      image: product.image,
      quantity: 1,
      slug: product.slug,
      stock: selectedSize ? selectedSize.stock : product.stock || 0,
      selectedSize: selectedSize || undefined,
      shopId: product.shopId || "default",
      shopName: product.shopName || "LinkAndSmile",
      commissionRate: product.commissionRate || 10,
    });
    toast({ title: "Added to cart", description: `${product.name} has been added to your cart.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-2xl border-stone-200 bg-white p-0">
        <div className="grid grid-cols-1 md:grid-cols-[44%_56%]">
          {/* ── Image panel ── */}
          <div className="relative flex min-h-[260px] items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 p-8">
            <div className="relative aspect-square w-full max-w-[280px]">
              {p.image && (
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  className={`object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoadingComplete={() => setImgLoaded(true)}
                />
              )}
              {(!p.image || !imgLoaded) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-400" />
                </div>
              )}
            </div>

            {discount > 0 && (
              <div className="absolute top-4 left-4 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-900">
                {discount}% OFF
              </div>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                <span className="rounded-full bg-stone-800 px-4 py-1.5 text-xs font-semibold text-white">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* ── Details panel ── */}
          <div className="flex h-full max-h-[85vh] flex-col overflow-y-auto p-6 md:p-7">
            {/* Seller */}
            <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-stone-400 uppercase">
              {p.shopName || "LinkAndSmile"}
            </p>

            {/* Title */}
            <DialogHeader className="mb-3 p-0 text-left">
              <DialogTitle className="text-xl leading-snug font-bold text-stone-900">
                {p.name}
              </DialogTitle>
              <DialogDescription className="sr-only">{p.name} quick view</DialogDescription>
            </DialogHeader>

            {/* Stars */}
            <div className="mb-4 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1 text-xs text-stone-400">4.5 · Verified reviews</span>
            </div>

            {/* Price */}
            <div className="mb-4 flex items-end gap-3 border-b border-stone-100 pb-4">
              <span className="text-2xl font-black text-stone-900">
                ₹{Math.round(displayPrice).toLocaleString()}
              </span>
              {currentDiscount && (
                <span className="mb-0.5 text-sm text-stone-400 line-through">
                  ₹{currentPrice.toLocaleString()}
                </span>
              )}
              {discount > 0 && (
                <span className="mb-0.5 rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
                  {discount}% off
                </span>
              )}
            </div>

            {/* Size selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
                  Select Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSize(s)}
                      disabled={s.stock === 0}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                        selectedSize?.size === s.size && selectedSize?.quantity === s.quantity
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50"
                      } ${s.stock === 0 ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                    >
                      {s.size} · {s.quantity}
                      {s.unit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA row */}
            <div className="mb-5 flex gap-2">
              <button
                onClick={handleAddToCart}
                disabled={loading || isOutOfStock}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isOutOfStock
                    ? "cursor-not-allowed bg-stone-100 text-stone-400"
                    : "bg-stone-900 text-white hover:bg-amber-500 hover:shadow-md active:scale-[0.98]"
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                {loading ? "Loading…" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>

              <Link
                href={`/products/${product.id}`}
                onClick={() => onOpenChange(false)}
                className="flex h-11 items-center gap-1.5 rounded-xl border-2 border-stone-200 px-4 text-xs font-semibold text-stone-600 transition-all hover:border-amber-300 hover:text-amber-700"
              >
                Full page <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Trust pills */}
            <div className="mb-5 flex flex-wrap gap-2">
              {[
                { icon: Truck, label: "Fast delivery" },
                { icon: ShieldCheck, label: "Authentic" },
                { icon: RotateCcw, label: "Easy return" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-500"
                >
                  <Icon className="h-3 w-3 text-amber-500" />
                  {label}
                </div>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description" className="w-full flex-1">
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-stone-100 p-1">
                {[
                  { value: "description", label: "Details" },
                  { value: "ingredients", label: "Ingredients" },
                  { value: "usage", label: "How to Use" },
                ].map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-lg py-1.5 text-xs font-semibold text-stone-400 transition-all data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-3 min-h-[80px]">
                <TabsContent value="description" className="mt-0 space-y-3">
                  <p className="text-sm leading-relaxed text-stone-600">
                    {p.description || "No description available for this product."}
                  </p>
                  {p.benefits && p.benefits.length > 0 && (
                    <ul className="space-y-1.5">
                      {p.benefits.map((b: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
                            ✓
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="ingredients" className="mt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {p.ingredients && p.ingredients.length > 0 ? (
                      p.ingredients.map((ing: string, i: number) => (
                        <span
                          key={i}
                          className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                        >
                          {ing}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-stone-400 italic">No ingredients listed.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="usage" className="mt-0">
                  <p className="text-sm leading-relaxed text-stone-600">
                    {p.usage || "No usage instructions provided."}
                  </p>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
