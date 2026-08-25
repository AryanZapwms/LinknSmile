// app/vendor/coupons/add/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currency";

export default function AddCouponPage() {
  const t = useTranslations("VendorAddCoupon");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    minOrderValue: "",
    maxDiscountAmount: "",
    usageLimit: "",
    perUserLimit: "",
    validFrom: "",
    validUntil: "",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.discountValue) {
      toast.error(t("requiredFieldsError"));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        code: formData.code.trim(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : undefined,
        maxDiscountAmount: formData.maxDiscountAmount
          ? parseFloat(formData.maxDiscountAmount)
          : undefined,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        perUserLimit: formData.perUserLimit ? parseInt(formData.perUserLimit) : undefined,
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
        isActive: formData.isActive,
      };
      const res = await fetch("/api/vendor/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t("couponCreated"));
        router.push("/vendor/coupons");
      } else {
        toast.error(data.message || t("createFailed"));
      }
    } catch (error) {
      toast.error(t("createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t("couponDetailsTitle")}</CardTitle>
            <CardDescription>{t("couponDetailsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t("code")}</Label>
              <Input
                id="code"
                required
                placeholder={t("codePlaceholder")}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="font-mono uppercase"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discountType">{t("discountType")}</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger id="discountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("percentageOff")}</SelectItem>
                    <SelectItem value="fixed">{t("fixedAmountOff")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === "percentage"
                    ? t("discountValuePercent")
                    : t("discountValueCurrency", { symbol: getCurrencySymbol() })}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  required
                  min="0"
                  max={formData.discountType === "percentage" ? 100 : undefined}
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                />
              </div>
            </div>

            {formData.discountType === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="maxDiscountAmount">
                  {t("maxDiscountAmount", { symbol: getCurrencySymbol() })}
                </Label>
                <Input
                  id="maxDiscountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("maxDiscountPlaceholder", { symbol: getCurrencySymbol() })}
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="minOrderValue">
                {t("minOrderValue", { symbol: getCurrencySymbol() })}
              </Label>
              <Input
                id="minOrderValue"
                type="number"
                min="0"
                step="0.01"
                placeholder={t("minOrderPlaceholder")}
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="usageLimit">{t("totalUsageLimit")}</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="1"
                  step="1"
                  placeholder={t("unlimited")}
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perUserLimit">{t("perCustomerLimit")}</Label>
                <Input
                  id="perUserLimit"
                  type="number"
                  min="1"
                  step="1"
                  placeholder={t("unlimited")}
                  value={formData.perUserLimit}
                  onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="validFrom">{t("validFrom")}</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">{t("validUntil")}</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>{t("activeImmediately")}</Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  t("createCoupon")
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/vendor/coupons")}
              >
                {t("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
