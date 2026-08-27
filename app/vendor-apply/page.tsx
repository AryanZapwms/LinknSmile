"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Store,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function VendorApplyPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const t = useTranslations("VendorApplyPage");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [intentMarked, setIntentMarked] = useState(false);

  const [formData, setFormData] = useState({
    shopName: "",
    description: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
  });

  // Redirect unauthenticated visitors to login, and existing vendors straight to their dashboard.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login?callbackUrl=/vendor-apply");
      return;
    }
    if (status === "authenticated" && session?.user?.role === "shop_owner") {
      router.replace("/vendor");
    }
  }, [status, session, router]);

  // Mark intent once, so the profile page can remind them if they leave without finishing.
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "user" && !intentMarked) {
      setIntentMarked(true);
      fetch("/api/vendor/apply/intent", { method: "POST" }).catch(() => {});
    }
  }, [status, session, intentMarked]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.shopName ||
      !formData.street ||
      !formData.city ||
      !formData.state ||
      !formData.pincode
    ) {
      setError(t("validationError"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("submitFailedDefault"));
        return;
      }

      setSuccess(true);
      await update({ role: "shop_owner", shopId: data.shopId });
      setTimeout(() => router.push("/vendor"), 1500);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden rounded-2xl border shadow-xl">
          <CardContent className="space-y-4 pt-12 pb-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">{t("successTitle")}</h2>
            <p className="text-muted-foreground">{t("successBody")}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <Card className="overflow-hidden rounded-2xl border shadow-xl">
          <CardHeader className="space-y-2 border-b pb-6">
            <CardTitle className="text-2xl font-bold">{t("formTitle")}</CardTitle>
            <CardDescription>
              {t("formSubtitle", {
                name: session?.user?.name || t("welcomeFallbackName"),
              })}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="shopName" className="flex items-center gap-2 text-sm font-bold">
                  <Store className="h-4 w-4 text-amber-500" /> {t("shopNameLabel")}
                </Label>
                <Input
                  id="shopName"
                  name="shopName"
                  placeholder={t("shopNamePlaceholder")}
                  value={formData.shopName}
                  onChange={handleChange}
                  required
                  className="h-11 rounded-xl border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-bold">
                  <Phone className="h-4 w-4 text-amber-500" /> {t("phoneLabel")}
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder={t("phonePlaceholder")}
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="h-11 rounded-xl border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street" className="flex items-center gap-2 text-sm font-bold">
                  <MapPin className="h-4 w-4 text-amber-500" /> {t("streetLabel")}
                </Label>
                <Input
                  id="street"
                  name="street"
                  placeholder={t("streetPlaceholder")}
                  value={formData.street}
                  onChange={handleChange}
                  required
                  className="h-11 rounded-xl border-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-bold">
                    {t("cityLabel")}
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder={t("cityPlaceholder")}
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-bold">
                    {t("stateLabel")}
                  </Label>
                  <Input
                    id="state"
                    name="state"
                    placeholder={t("statePlaceholder")}
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="h-11 rounded-xl border-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode" className="text-sm font-bold">
                  {t("pincodeLabel")}
                </Label>
                <Input
                  id="pincode"
                  name="pincode"
                  placeholder={t("pincodePlaceholder")}
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  className="h-11 rounded-xl border-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstNumber" className="flex items-center gap-2 text-sm font-bold">
                    <FileText className="h-3.5 w-3.5" /> {t("gstLabel")}
                  </Label>
                  <Input
                    id="gstNumber"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNumber" className="flex items-center gap-2 text-sm font-bold">
                    <FileText className="h-3.5 w-3.5" /> {t("panLabel")}
                  </Label>
                  <Input
                    id="panNumber"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleChange}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-sm text-amber-800 italic">
                {t("termsNotice")}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-stone-900 font-bold text-white hover:bg-amber-500"
              >
                {loading ? (
                  <Loader2 className="me-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="me-2 h-5 w-5" />
                )}
                {loading ? t("submitting") : t("submitApplication")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
