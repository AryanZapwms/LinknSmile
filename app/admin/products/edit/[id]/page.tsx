// app/admin/products/edit/[id]/page.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X, Upload, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Category {
  _id: string;
  name: string;
  slug: string;
  parent?: { name: string; slug: string; _id?: string };
  subCategories?: Category[];
}

interface Result {
  image: string;
  title: string;
  text: string;
}

interface Size {
  size: string;
  unit: "ml" | "l" | "g" | "kg";
  quantity: number;
  price: number;
  discountPrice?: number;
  stock: number;
  sku?: string;
}

const createEmptySize = (): Size => ({
  size: "",
  unit: "ml",
  quantity: 0,
  price: 0,
  discountPrice: 0,
  stock: 0,
  sku: "",
});

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  image: string;
  images?: string[];
  category: string;
  stock: number;
  sku: string;
  ingredients: string | string[];
  benefits: string | string[];
  usage: string;
  suitableFor?: string | string[];
  results?: Result[];
  sizes?: Size[];
  isActive: boolean;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const productId = params.id as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingResult, setUploadingResult] = useState(false);
  const [message, setMessage] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [formData, setFormData] = useState<Product & { mainCategory?: string }>({
    _id: "",
    name: "",
    slug: "",
    description: "",
    price: 0,
    discountPrice: 0,
    image: "",
    images: [],
    category: "",
    mainCategory: "",
    stock: 0,
    sku: "",
    ingredients: [],
    benefits: [],
    usage: "",
    suitableFor: [],
    results: [],
    isActive: true,
  });
  const [results, setResults] = useState<Array<{ image: string; title: string; text: string }>>([]);
  const [resultInput, setResultInput] = useState({ image: "", title: "", text: "" });
  const [resultImageUrl, setResultImageUrl] = useState("");
  const [sizes, setSizes] = useState<Size[]>([]);
  const [editingSizeIndex, setEditingSizeIndex] = useState<number | null>(null);
  const [sizeInput, setSizeInput] = useState<Size>(createEmptySize());

  useEffect(() => {
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchData();
  }, [session, router]);

  const fetchData = async () => {
    try {
      const [productRes, categoriesRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch("/api/categories"),
      ]);

      const productData = await productRes.json();
      const categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];

      const categoryId =
        typeof productData.category === "object" ? productData.category._id : productData.category;

      const formDataWithIds = { ...productData, category: categoryId };

      setFormData(formDataWithIds);
      setImageUrls(productData.images || (productData.image ? [productData.image] : []));
      setResults(productData.results || []);
      setSizes(productData.sizes || []);
      setCategories(categoriesData);

      const mainCat = categoriesData.find((c: Category) => c._id === categoryId);
      if (mainCat) {
        setFormData((prev) => ({ ...prev, mainCategory: mainCat._id, category: "" }));
      } else {
        for (const main of categoriesData) {
          const subCat = main.subCategories?.find((sub: Category) => sub._id === categoryId);
          if (subCat) {
            setFormData((prev) => ({
              ...prev,
              mainCategory: main._id,
              category: subCat._id,
            }));
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage("Error loading product data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      const formDataToSend = new FormData();
      Array.from(files).forEach((file) => formDataToSend.append("files", file));
      const res = await fetch("/api/upload", { method: "POST", body: formDataToSend });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrls((prev) => [...prev, ...data.urls]);
    } catch (error) {
      setMessage("Error uploading images. Please try again.");
      console.error("Error:", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImageUrls((prev) => [...prev, imageUrlInput.trim()]);
      setImageUrlInput("");
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSize = () => {
    if (!sizeInput.size || sizeInput.quantity <= 0 || sizeInput.price <= 0) {
      setMessage("Please fill in all size fields with valid values");
      return;
    }
    setSizes((prev) => {
      if (editingSizeIndex !== null) {
        return prev.map((size, index) => (index === editingSizeIndex ? { ...sizeInput } : size));
      }
      return [...prev, { ...sizeInput }];
    });
    setSizeInput(createEmptySize());
    setEditingSizeIndex(null);
    setMessage("");
  };

  const removeSize = (index: number) => {
    setSizes((prev) => prev.filter((_, i) => i !== index));
    if (editingSizeIndex === index) {
      setSizeInput(createEmptySize());
      setEditingSizeIndex(null);
    }
  };

  const handleEditSize = (index: number) => {
    setSizeInput({ ...sizes[index] });
    setEditingSizeIndex(index);
  };

  const handleCancelEditSize = () => {
    setSizeInput(createEmptySize());
    setEditingSizeIndex(null);
    setMessage("");
  };

  const handleResultFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingResult(true);
    try {
      const formDataToSend = new FormData();
      Array.from(files).forEach((file) => formDataToSend.append("files", file));
      const res = await fetch("/api/upload", { method: "POST", body: formDataToSend });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.urls && data.urls[0]) setResultImageUrl(data.urls[0]);
    } catch (error) {
      setMessage("Error uploading result image. Please try again.");
      console.error("Error:", error);
    } finally {
      setUploadingResult(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrls.length === 0) {
      setMessage("Please add at least one image.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const bodyData = {
        ...formData,
        image: imageUrls[0],
        images: imageUrls,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
        stock: Number(formData.stock),
        ingredients: toArray(formData.ingredients),
        benefits: toArray(formData.benefits),
        suitableFor: toArray(formData.suitableFor),
        results,
        sizes: sizes.map((s) => ({
          ...s,
          quantity: Number(s.quantity),
          price: Number(s.price),
          discountPrice: s.discountPrice ? Number(s.discountPrice) : undefined,
          stock: Number(s.stock),
        })),
      };

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || "Failed to update product");

      setMessage("Product updated successfully!");
      setTimeout(() => router.push("/admin/products"), 1500);
    } catch (error) {
      setMessage("Error updating product. Please try again.");
      console.error("Error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading product...</p>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/admin/products">
          <Button variant="ghost" className="mb-6 bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </Link>

        <h1 className="text-foreground mb-8 text-3xl font-bold">Edit Product</h1>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Product Name *
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter product name"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">Slug</label>
                  <Input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="Product slug"
                    className="bg-background border-border"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Main Category *
                  </label>
                  <select
                    name="mainCategory"
                    value={formData.mainCategory || ""}
                    onChange={handleChange}
                    required
                    className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                  >
                    <option value="">Select Main Category</option>
                    {categories
                      .filter((c) => !c.parent)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Sub Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                  >
                    <option value="">Select Sub Category</option>
                    {categories
                      .find((c) => c._id === formData.mainCategory)
                      ?.subCategories?.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name}
                        </option>
                      )) || []}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter product description"
                  rows={4}
                  className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Price (₹) *
                  </label>
                  <Input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    placeholder="0"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Discount Price (₹)
                  </label>
                  <Input
                    type="number"
                    name="discountPrice"
                    value={formData.discountPrice || ""}
                    onChange={handleChange}
                    placeholder="0"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">Stock *</label>
                  <Input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    required
                    placeholder="0"
                    className="bg-background border-border"
                  />
                </div>
              </div>

              {/* Images Upload */}
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Product Images *
                </label>
                <div className="border-border bg-muted/50 space-y-4 rounded-lg border p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="border-border hover:bg-muted/50 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-6 transition">
                        <div className="text-center">
                          <Upload className="text-muted-foreground mx-auto mb-2 h-6 w-6" />
                          <p className="text-foreground text-sm font-medium">Upload from Machine</p>
                          <p className="text-muted-foreground text-xs">PNG, JPG up to 5MB</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Add Image URL
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          className="bg-background border-border flex-1"
                        />
                        <Button type="button" onClick={handleAddImageUrl} variant="outline">
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {uploading && <p className="text-muted-foreground text-sm">Uploading...</p>}

                  {imageUrls.length > 0 && (
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Added Images ({imageUrls.length})
                      </label>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="group relative">
                            <div className="bg-muted relative h-24 overflow-hidden rounded-lg">
                              <Image
                                src={url}
                                alt={`Product ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                              {index === 0 && (
                                <div className="bg-primary text-primary-foreground absolute top-1 left-1 rounded px-2 py-1 text-xs">
                                  Main
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="text-destructive-foreground absolute top-1 right-1 rounded-full p-1 opacity-0 transition group-hover:opacity-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">SKU</label>
                <Input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="SKU-001"
                  className="bg-background border-border"
                />
              </div>

              {/* Product Sizes */}
              <div>
                <label className="text-foreground mb-4 block text-sm font-medium">
                  Product Sizes (Optional - Add size variants)
                </label>
                <div className="border-border bg-muted/50 space-y-4 rounded-lg border p-4">
                  <div className="border-border space-y-3 border-b pb-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-foreground mb-2 block text-sm font-medium">
                          Size Name *
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g., 50ml, 100ml, 1L"
                          value={sizeInput.size}
                          onChange={(e) => setSizeInput({ ...sizeInput, size: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <label className="text-foreground mb-2 block text-sm font-medium">
                          Unit *
                        </label>
                        <select
                          value={sizeInput.unit}
                          onChange={(e) =>
                            setSizeInput({
                              ...sizeInput,
                              unit: e.target.value as "ml" | "l" | "g" | "kg",
                            })
                          }
                          className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                        >
                          <option value="ml">Milliliters (ml)</option>
                          <option value="l">Liters (l)</option>
                          <option value="g">Grams (g)</option>
                          <option value="kg">Kilograms (kg)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-foreground mb-2 block text-sm font-medium">
                          Quantity *
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 50"
                          value={sizeInput.quantity || ""}
                          onChange={(e) =>
                            setSizeInput({ ...sizeInput, quantity: Number(e.target.value) })
                          }
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <label className="text-foreground mb-2 block text-sm font-medium">
                          Price (₹) *
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={sizeInput.price || ""}
                          onChange={(e) =>
                            setSizeInput({ ...sizeInput, price: Number(e.target.value) })
                          }
                          className="bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-foreground mb-2 block text-sm font-medium">
                          Discount Price (₹)
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={sizeInput.discountPrice || ""}
                          onChange={(e) =>
                            setSizeInput({
                              ...sizeInput,
                              discountPrice: Number(e.target.value) || 0,
                            })
                          }
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <label className="text-foreground mb-2 block text-sm font-medium">
                          Stock *
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={sizeInput.stock || ""}
                          onChange={(e) =>
                            setSizeInput({ ...sizeInput, stock: Number(e.target.value) })
                          }
                          className="bg-background border-border"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Size SKU (Optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., SKU-50ML"
                        value={sizeInput.sku || ""}
                        onChange={(e) => setSizeInput({ ...sizeInput, sku: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Button
                        type="button"
                        onClick={handleAddSize}
                        variant="outline"
                        className="w-full"
                      >
                        {editingSizeIndex !== null ? "Update Size" : "Add Size"}
                      </Button>
                      {editingSizeIndex !== null && (
                        <Button
                          type="button"
                          onClick={handleCancelEditSize}
                          variant="secondary"
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {sizes.length > 0 && (
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Added Sizes ({sizes.length})
                      </label>
                      <div className="space-y-2">
                        {sizes.map((size, index) => (
                          <div
                            key={index}
                            className="group border-border bg-background relative flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="flex-1">
                              <p className="text-foreground text-sm font-medium">
                                {size.size} ({size.quantity}
                                {size.unit})
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Price: ₹{size.price}
                                {size.discountPrice ? ` → ₹${size.discountPrice}` : ""} | Stock:{" "}
                                {size.stock}
                              </p>
                            </div>
                            <div className="flex w-full gap-2 md:w-auto">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 md:flex-none"
                                onClick={() => handleEditSize(index)}
                              >
                                <Pencil className="mr-1 h-4 w-4" /> Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => removeSize(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ingredients & Benefits */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Ingredients (comma-separated)
                  </label>
                  <textarea
                    name="ingredients"
                    value={
                      Array.isArray(formData.ingredients)
                        ? formData.ingredients.join(", ")
                        : formData.ingredients
                    }
                    onChange={handleChange}
                    placeholder="Ingredient 1, Ingredient 2, Ingredient 3"
                    rows={3}
                    className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Benefits (comma-separated)
                  </label>
                  <textarea
                    name="benefits"
                    value={
                      Array.isArray(formData.benefits)
                        ? formData.benefits.join(", ")
                        : formData.benefits
                    }
                    onChange={handleChange}
                    placeholder="Benefit 1, Benefit 2, Benefit 3"
                    rows={3}
                    className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                  />
                </div>
              </div>

              {/* Usage */}
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Usage Instructions
                </label>
                <textarea
                  name="usage"
                  value={formData.usage}
                  onChange={handleChange}
                  placeholder="Enter usage instructions"
                  rows={3}
                  className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                />
              </div>

              {/* Suitable For */}
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Suitable For (comma-separated)
                </label>
                <textarea
                  name="suitableFor"
                  value={
                    Array.isArray(formData.suitableFor)
                      ? formData.suitableFor.join(", ")
                      : formData.suitableFor
                  }
                  onChange={handleChange}
                  placeholder="Suitable for 1, Suitable for 2, Suitable for 3"
                  rows={3}
                  className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                />
              </div>

              {/* Results Section */}
              <div>
                <label className="text-foreground mb-4 block text-sm font-medium">
                  Product Results
                </label>
                <div className="border-border bg-muted/50 space-y-4 rounded-lg border p-4">
                  <div className="border-border space-y-3 border-b pb-4">
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Result Title
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., Brightening Results"
                        value={resultInput.title}
                        onChange={(e) => setResultInput({ ...resultInput, title: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Result Description
                      </label>
                      <textarea
                        placeholder="Describe the result"
                        value={resultInput.text}
                        onChange={(e) => setResultInput({ ...resultInput, text: e.target.value })}
                        rows={2}
                        className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Result Image
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={resultImageUrl}
                            onChange={(e) => setResultImageUrl(e.target.value)}
                            className="bg-background border-border flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (resultImageUrl.trim() && resultInput.title.trim()) {
                                setResults([
                                  ...results,
                                  {
                                    image: resultImageUrl.trim(),
                                    title: resultInput.title,
                                    text: resultInput.text,
                                  },
                                ]);
                                setResultInput({ image: "", title: "", text: "" });
                                setResultImageUrl("");
                              }
                            }}
                            variant="outline"
                          >
                            Add Result
                          </Button>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground mb-2 text-xs">
                            Or upload from device:
                          </p>
                          <label className="border-border hover:bg-muted/50 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-3 transition">
                            <div className="text-center">
                              <Upload className="text-muted-foreground mx-auto mb-1 h-4 w-4" />
                              <p className="text-foreground text-xs font-medium">Upload Image</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleResultFileUpload}
                              disabled={uploadingResult}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {results.length > 0 && (
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Added Results ({results.length})
                      </label>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {results.map((result, index) => (
                          <div
                            key={index}
                            className="group border-border bg-background relative flex gap-3 rounded-lg border p-3"
                          >
                            <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded">
                              <Image
                                src={result.image}
                                alt={result.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground truncate text-sm font-medium">
                                {result.title}
                              </p>
                              <p className="text-muted-foreground line-clamp-2 text-xs">
                                {result.text}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setResults(results.filter((_, i) => i !== index))}
                              className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full p-1 opacity-0 transition group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Link href="/admin/products">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Updating..." : "Update Product"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}