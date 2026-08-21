// app/vendor/products/edit/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
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
import { Loader2, Upload, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getCurrencySymbol } from "@/lib/currency";

interface Category {
  _id: string;
  name: string;
}

interface Company {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number;
  image?: string;
  images: string[];
  category?: { _id: string; name: string };
  company: { _id: string; name: string };
  stock: number;
  sku?: string;
  ingredients?: string[];
  benefits?: string[];
  usage?: string;
  suitableFor?: string[];
  approvalStatus: string;
  rejectionReason?: string;
}

export default function EditProductPage() {
  const t = useTranslations("VendorEditProduct");
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [uploading, setUploading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    discountPrice: "",
    image: "",
    images: [] as string[],
    category: "",
    company: "",
    stock: "",
    sku: "",
    ingredients: "",
    benefits: "",
    usage: "",
    suitableFor: "",
  });

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchCompanies();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/vendor/products/${productId}`);
      const data = await res.json();

      if (data.success) {
        const prod = data.product;
        setProduct(prod);
        setFormData({
          name: prod.name || "",
          slug: prod.slug || "",
          description: prod.description || "",
          price: prod.price?.toString() || "",
          discountPrice: prod.discountPrice?.toString() || "",
          image: prod.image || "",
          images: prod.images || [],
          category: prod.category?._id || "",
          company: prod.company?._id || "",
          stock: prod.stock?.toString() || "0",
          sku: prod.sku || "",
          ingredients: prod.ingredients?.join("\n") || "",
          benefits: prod.benefits?.join("\n") || "",
          usage: prod.usage || "",
          suitableFor: prod.suitableFor?.join(", ") || "",
        });
      } else {
        toast.error(t("productNotFoundToast"));
        router.push("/vendor/products");
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadFormData = new FormData();

    Array.from(files).forEach((file) => {
      uploadFormData.append("files", file);
    });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();

      if (data.urls && data.urls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          image: prev.image || data.urls[0],
          images: [...prev.images, ...data.urls],
        }));
        toast.success(t("imagesUploadedSuccess"));
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        image: index === 0 ? newImages[0] || "" : prev.image,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.price || !formData.company) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    setSaving(true);

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

      const res = await fetch(`/api/vendor/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || t("updateSuccess"));
        router.push("/vendor/products");
      } else {
        toast.error(data.message || t("updateFailed"));
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error(t("updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error")}</AlertTitle>
        <AlertDescription>{t("productNotFound")}</AlertDescription>
      </Alert>
    );
  }

  const statusLabels: Record<string, string> = {
    approved: t("statusApproved"),
    pending: t("statusPending"),
    rejected: t("statusRejected"),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Badge
          variant={
            product.approvalStatus === "approved"
              ? "default"
              : product.approvalStatus === "pending"
                ? "outline"
                : "destructive"
          }
        >
          {statusLabels[product.approvalStatus] || product.approvalStatus}
        </Badge>
      </div>

      {/* Alerts */}
      {product.approvalStatus === "approved" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("reApprovalRequiredTitle")}</AlertTitle>
          <AlertDescription>{t("reApprovalRequiredDesc")}</AlertDescription>
        </Alert>
      )}

      {product.approvalStatus === "rejected" && product.rejectionReason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("productRejectedTitle")}</AlertTitle>
          <AlertDescription>
            <strong>{t("reasonPrefix")}</strong> {product.rejectionReason}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInfo")}</CardTitle>
            <CardDescription>{t("basicInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("productName")}</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">{t("slug")}</Label>
                <Input
                  id="slug"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">{t("brand")}</Label>
                <Select
                  value={formData.company}
                  onValueChange={(value) => setFormData({ ...formData, company: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectBrand")} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company._id} value={company._id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t("category")}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">{t("price", { symbol: getCurrencySymbol() })}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPrice">
                  {t("discountPrice", { symbol: getCurrencySymbol() })}
                </Label>
                <Input
                  id="discountPrice"
                  type="number"
                  step="0.01"
                  value={formData.discountPrice}
                  onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">{t("stockQuantity")}</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">{t("sku")}</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>{t("productImages")}</CardTitle>
            <CardDescription>{t("productImagesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="images" className="cursor-pointer">
                <div className="hover:border-primary rounded-lg border-2 border-dashed p-8 text-center transition-colors">
                  {uploading ? (
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
                      <p className="text-primary font-medium">{t("uploadingImages")}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                      <p className="text-muted-foreground text-sm">{t("clickToUpload")}</p>
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
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 end-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === 0 && (
                      <Badge className="absolute bottom-2 start-2">{t("mainImage")}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t("additionalDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ingredients">{t("ingredients")}</Label>
              <Textarea
                id="ingredients"
                rows={4}
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">{t("benefits")}</Label>
              <Textarea
                id="benefits"
                rows={4}
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage">{t("howToUse")}</Label>
              <Textarea
                id="usage"
                rows={3}
                value={formData.usage}
                onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suitableFor">{t("suitableFor")}</Label>
              <Input
                id="suitableFor"
                value={formData.suitableFor}
                onChange={(e) => setFormData({ ...formData, suitableFor: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={saving || uploading}>
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {saving ? t("saving") : t("saveChanges")}
          </Button>
          <Button type="button" variant="outline" size="lg" asChild>
            <Link href="/vendor/products">{t("cancel")}</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
