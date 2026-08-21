"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, GripVertical, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency } from "@/lib/currency";

interface Product {
  _id: string;
  name: string;
  image: string;
  price: number;
  discountPrice?: number;
}

interface HeroProduct {
  _id: string;
  productId: Product | null;
  sortOrder: number;
  isActive: boolean;
}

function SortableHeroRow({
  entry,
  onToggle,
  onRemove,
}: {
  entry: HeroProduct;
  onToggle: (id: string, isActive: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry._id,
  });

  if (!entry.productId) return null;

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground cursor-grab touch-none active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <img
          src={entry.productId.image}
          alt={entry.productId.name}
          className="h-14 w-14 flex-shrink-0 rounded object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{entry.productId.name}</p>
          <p className="text-muted-foreground text-sm">
            {formatCurrency(entry.productId.discountPrice ?? entry.productId.price)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Badge variant={entry.isActive ? "default" : "secondary"}>
            {entry.isActive ? "Active" : "Inactive"}
          </Badge>
          <Switch checked={entry.isActive} onCheckedChange={(checked) => onToggle(entry._id, checked)} />
          <Button variant="outline" size="sm" onClick={() => onRemove(entry._id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HeroProductsPage() {
  const [heroProducts, setHeroProducts] = useState<HeroProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    fetchHeroProducts();
    fetchAllProducts();
  }, []);

  const fetchHeroProducts = async () => {
    try {
      const res = await fetch("/api/admin/hero-products");
      if (res.ok) {
        setHeroProducts(await res.json());
      } else {
        toast({ title: "Error", description: "Failed to fetch featured products", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching hero products:", error);
      toast({ title: "Error", description: "Failed to fetch featured products", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=200");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.products ?? data?.data ?? []);
        setAllProducts(list);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const featuredIds = useMemo(
    () => new Set(heroProducts.map((hp) => hp.productId?._id).filter(Boolean)),
    [heroProducts]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) => !featuredIds.has(p._id) && p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allProducts, featuredIds]);

  const handleAdd = async (productId: string) => {
    try {
      const res = await fetch("/api/admin/hero-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        setSearch("");
        fetchHeroProducts();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to add product", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error adding hero product:", error);
      toast({ title: "Error", description: "Failed to add product", variant: "destructive" });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    setHeroProducts((prev) => prev.map((hp) => (hp._id === id ? { ...hp, isActive } : hp)));
    try {
      await fetch(`/api/admin/hero-products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
    } catch (error) {
      console.error("Error toggling hero product:", error);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this product from the homepage spotlight?")) return;
    try {
      const res = await fetch(`/api/admin/hero-products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHeroProducts((prev) => prev.filter((hp) => hp._id !== id));
      } else {
        toast({ title: "Error", description: "Failed to remove product", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error removing hero product:", error);
      toast({ title: "Error", description: "Failed to remove product", variant: "destructive" });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = heroProducts.findIndex((hp) => hp._id === active.id);
    const newIndex = heroProducts.findIndex((hp) => hp._id === over.id);
    const reordered = arrayMove(heroProducts, oldIndex, newIndex);
    setHeroProducts(reordered);

    try {
      await fetch("/api/admin/hero-products/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((hp) => hp._id) }),
      });
    } catch (error) {
      console.error("Error saving new order:", error);
      toast({ title: "Error", description: "Failed to save new order", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Loading featured products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="m-6">
        <h1 className="text-3xl font-bold">Hero Products</h1>
        <p className="text-muted-foreground">Curate the homepage "Featured" spotlight</p>
      </div>

      <Card className="mx-6">
        <CardHeader>
          <CardTitle>Add a product</CardTitle>
          <CardDescription>Search by name to add it to the homepage spotlight</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1 rounded-md border p-1">
              {searchResults.map((p) => (
                <button
                  key={p._id}
                  onClick={() => handleAdd(p._id)}
                  className="hover:bg-accent flex w-full items-center gap-3 rounded p-2 text-left text-sm"
                >
                  <img src={p.image} alt={p.name} className="h-8 w-8 rounded object-cover" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(p.discountPrice ?? p.price)}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mx-6 grid gap-3">
        {heroProducts.length === 0 ? (
          <Card>
            <CardContent className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">
                No featured products yet. Search above to add your first one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={heroProducts.map((hp) => hp._id)} strategy={verticalListSortingStrategy}>
              {heroProducts.map((entry) => (
                <SortableHeroRow
                  key={entry._id}
                  entry={entry}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
