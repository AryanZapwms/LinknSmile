// app/vendor/products/add/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Category {
  _id: string;
  name: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    discountPrice: "",
    image: "",
    images: [] as string[],
    category: "",
    stock: "",
    sku: "",
    origin: "unspecified" as "made-in-india" | "foreign-made" | "unspecified",
    ingredients: "",
    benefits: "",
    usage: "",
    suitableFor: "",
  });

  useEffect(() => {
    fetch("/api/categories?flat=true")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.name]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((file) => fd.append("files", file));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.urls?.length > 0) {
        setFormData((prev) => ({
          ...prev,
          image: prev.image || data.urls[0],
          images: [...prev.images, ...data.urls],
        }));
        toast.success("Images uploaded");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : undefined,
        stock: formData.stock ? parseInt(formData.stock) : 0,
        ingredients: formData.ingredients ? formData.ingredients.split("\n").filter(Boolean) : [],
        benefits: formData.benefits ? formData.benefits.split("\n").filter(Boolean) : [],
        suitableFor: formData.suitableFor
          ? formData.suitableFor
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        category: formData.category || undefined,
      };
      const res = await fetch("/api/vendor/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Product submitted for approval!");
        router.push("/vendor/products");
      } else {
        toast.error(data.message || "Failed to create product");
      }
    } catch {
      toast.error("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof formData) => ({
    value: formData[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
        <p className="text-muted-foreground">Create a new product listing for your shop</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Approval Required</AlertTitle>
        <AlertDescription>
          Products must be approved by admin before appearing on the storefront.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential product details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  required
                  {...field("name")}
                  placeholder="e.g., Handmade Chocolate Box"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" required {...field("slug")} placeholder="auto-generated" />
                <p className="text-muted-foreground text-xs">URL-friendly name</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Origin field ── */}
              <div className="space-y-2">
                <Label htmlFor="origin">Product Origin *</Label>
                <Select
                  value={formData.origin}
                  onValueChange={(v) => setFormData((p) => ({ ...p, origin: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="made-in-india">🇮🇳 Made in India</SelectItem>
                    <SelectItem value="foreign-made">🌍 International / Foreign Made</SelectItem>
                    <SelectItem value="unspecified">🏷️ Unspecified</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Helps buyers filter by origin in the marketplace
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  {...field("price")}
                  placeholder="999.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPrice">Discount Price (₹)</Label>
                <Input
                  id="discountPrice"
                  type="number"
                  step="0.01"
                  {...field("discountPrice")}
                  placeholder="799.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input id="stock" type="number" {...field("stock")} placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...field("sku")} placeholder="PROD-12345" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                {...field("description")}
                placeholder="Detailed product description..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>First image will be the main display image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="images" className="cursor-pointer">
              <div className="hover:border-primary rounded-lg border-2 border-dashed p-8 text-center transition-colors">
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
                    <p className="text-primary font-medium">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </Label>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {formData.images.map((img, i) => (
                  <div key={i} className="group relative">
                    <img
                      src={img}
                      alt={`Product ${i + 1}`}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeImage(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {i === 0 && <Badge className="absolute bottom-2 left-2">Main</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
            <CardDescription>Optional but helps buyers make decisions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredients (one per line)</Label>
              <Textarea
                id="ingredients"
                rows={3}
                {...field("ingredients")}
                placeholder="Water&#10;Glycerin&#10;..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits (one per line)</Label>
              <Textarea
                id="benefits"
                rows={3}
                {...field("benefits")}
                placeholder="Moisturizes skin&#10;..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage">How to Use</Label>
              <Textarea
                id="usage"
                rows={3}
                {...field("usage")}
                placeholder="Apply twice daily..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suitableFor">Suitable For (comma-separated)</Label>
              <Input
                id="suitableFor"
                {...field("suitableFor")}
                placeholder="All skin types, Sensitive skin"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={loading || uploading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Submitting..." : "Submit for Approval"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
