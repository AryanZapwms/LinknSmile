// app/vendor/products/add/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { getCurrencySymbol } from "@/lib/currency";

interface Category {
  _id: string;
  name: string;
}

export default function AddProductPage() {
  const t = useTranslations("VendorAddProduct");
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
        toast.success(t("imagesUploaded"));
      }
    } catch {
      toast.error(t("uploadFailed"));
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
      toast.error(t("fillRequiredFields"));
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
        toast.success(t("productSubmitted"));
        router.push("/vendor/products");
      } else {
        toast.error(data.message || t("createFailed"));
      }
    } catch {
      toast.error(t("createFailed"));
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
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("approvalRequiredTitle")}</AlertTitle>
        <AlertDescription>{t("approvalRequiredDesc")}</AlertDescription>
      </Alert>

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
                  {...field("name")}
                  placeholder={t("productNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">{t("slug")}</Label>
                <Input id="slug" required {...field("slug")} placeholder={t("slugPlaceholder")} />
                <p className="text-muted-foreground text-xs">{t("slugHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t("category")}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCategory")} />
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
                <Label htmlFor="origin">{t("productOrigin")}</Label>
                <Select
                  value={formData.origin}
                  onValueChange={(v) => setFormData((p) => ({ ...p, origin: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectOrigin")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="made-in-india">{t("originMadeInIndia")}</SelectItem>
                    <SelectItem value="foreign-made">{t("originForeignMade")}</SelectItem>
                    <SelectItem value="unspecified">{t("originUnspecified")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">{t("originHint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">{t("price", { symbol: getCurrencySymbol() })}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  {...field("price")}
                  placeholder={t("pricePlaceholder")}
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
                  {...field("discountPrice")}
                  placeholder={t("discountPricePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">{t("stockQuantity")}</Label>
                <Input id="stock" type="number" {...field("stock")} placeholder={t("stockPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">{t("sku")}</Label>
                <Input id="sku" {...field("sku")} placeholder={t("skuPlaceholder")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                rows={4}
                {...field("description")}
                placeholder={t("descriptionPlaceholder")}
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
            <Label htmlFor="images" className="cursor-pointer">
              <div className="hover:border-primary rounded-lg border-2 border-dashed p-8 text-center transition-colors">
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
                    <p className="text-primary font-medium">{t("uploadingImages")}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">{t("clickToUpload")}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{t("imageFormatHint")}</p>
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
                      className="absolute top-2 end-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeImage(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {i === 0 && <Badge className="absolute bottom-2 start-2">{t("main")}</Badge>}
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
            <CardDescription>{t("additionalDetailsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ingredients">{t("ingredients")}</Label>
              <Textarea
                id="ingredients"
                rows={3}
                {...field("ingredients")}
                placeholder={t("ingredientsPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefits">{t("benefits")}</Label>
              <Textarea
                id="benefits"
                rows={3}
                {...field("benefits")}
                placeholder={t("benefitsPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage">{t("howToUse")}</Label>
              <Textarea
                id="usage"
                rows={3}
                {...field("usage")}
                placeholder={t("howToUsePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suitableFor">{t("suitableFor")}</Label>
              <Input
                id="suitableFor"
                {...field("suitableFor")}
                placeholder={t("suitableForPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={loading || uploading}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {loading ? t("submitting") : t("submitForApproval")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            disabled={loading}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
