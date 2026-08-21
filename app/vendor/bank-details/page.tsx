// app/vendor/bank-details/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  CreditCard,
  Globe,
  Loader2,
  Save,
  ShieldCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
} from "lucide-react";

interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode?: string;
  upiId?: string;
}

const EMPTY_FORM: BankDetails = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  swiftCode: "",
  upiId: "",
};

/** Mask everything except the last 4 digits */
function maskAccount(num: string) {
  if (!num || num.length < 4) return num;
  return "•".repeat(num.length - 4) + num.slice(-4);
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}
function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex cursor-help items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 p-2 text-xs text-white shadow-lg">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

export default function VendorBankDetailsPage() {
  const t = useTranslations("VendorBankDetails");
  const [form, setForm] = useState<BankDetails>(EMPTY_FORM);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  // Client-side validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof BankDetails, string>>>({});

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const res = await fetch("/api/vendor/bank-details");
      const data = await res.json();
      if (data.success && data.bankDetails) {
        setForm({
          accountHolderName: data.bankDetails.accountHolderName || "",
          bankName: data.bankDetails.bankName || "",
          accountNumber: data.bankDetails.accountNumber || "",
          ifscCode: data.bankDetails.ifscCode || "",
          swiftCode: data.bankDetails.swiftCode || "",
          upiId: data.bankDetails.upiId || "",
        });
        setIsComplete(data.isComplete ?? false);
      }
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BankDetails, string>> = {};

    if (!form.accountHolderName.trim())
      newErrors.accountHolderName = t("accountHolderRequired");

    if (!form.bankName.trim()) newErrors.bankName = t("bankNameRequired");

    if (!form.accountNumber.trim()) {
      newErrors.accountNumber = t("accountNumberRequired");
    } else if (!/^\d{9,18}$/.test(form.accountNumber.trim())) {
      newErrors.accountNumber = t("accountNumberInvalid");
    }

    const hasIfsc = form.ifscCode?.trim();
    const hasSwift = form.swiftCode?.trim();

    if (!hasIfsc && !hasSwift) {
      newErrors.ifscCode = t("ifscOrSwiftRequired");
    }
    if (hasIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())) {
      newErrors.ifscCode = t("ifscInvalid");
    }
    if (
      hasSwift &&
      !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(form.swiftCode!.trim().toUpperCase())
    ) {
      newErrors.swiftCode = t("swiftInvalid");
    }

    if (form.upiId?.trim() && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(form.upiId.trim())) {
      newErrors.upiId = t("upiInvalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/vendor/bank-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ifscCode: form.ifscCode?.trim().toUpperCase(),
          swiftCode: form.swiftCode?.trim().toUpperCase() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsComplete(true);
        toast.success(t("saveSuccess"));
      } else {
        toast.error(data.message || t("saveFailed"));
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof BankDetails, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <CreditCard className="text-primary h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
          {isComplete ? (
            <Badge className="ms-auto gap-1 bg-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("payoutReady")}
            </Badge>
          ) : (
            <Badge variant="outline" className="ms-auto gap-1 border-orange-400 text-orange-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("incomplete")}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Incomplete warning ────────────────────────────────────────────── */}
      {!isComplete && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
          <div>
            <p className="text-sm font-medium text-orange-800">{t("incompleteWarningTitle")}</p>
            <p className="mt-0.5 text-xs text-orange-700">{t("incompleteWarningDesc")}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} noValidate>
        {/* ── Account & Bank Info ───────────────────────────────────────── */}
        <Card className="mb-5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="text-muted-foreground h-4 w-4" />
              {t("accountInfoTitle")}
            </CardTitle>
            <CardDescription>{t("accountInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            {/* Account Holder Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="acHolder">
                {t("accountHolderName")} <span className="text-red-500">*</span>
              </label>
              <Input
                id="acHolder"
                value={form.accountHolderName}
                onChange={(e) => setField("accountHolderName", e.target.value)}
                placeholder={t("accountHolderPlaceholder")}
                className={
                  errors.accountHolderName ? "border-red-400 focus-visible:ring-red-400" : ""
                }
              />
              {errors.accountHolderName && (
                <p className="text-xs text-red-500">{errors.accountHolderName}</p>
              )}
              <p className="text-muted-foreground text-xs">{t("accountHolderHint")}</p>
            </div>

            {/* Bank Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="bankName">
                {t("bankName")} <span className="text-red-500">*</span>
              </label>
              <Input
                id="bankName"
                value={form.bankName}
                onChange={(e) => setField("bankName", e.target.value)}
                placeholder={t("bankNamePlaceholder")}
                className={errors.bankName ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {errors.bankName && <p className="text-xs text-red-500">{errors.bankName}</p>}
            </div>

            {/* Account Number */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="acNumber">
                {t("accountNumber")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="acNumber"
                  type={showAccount ? "text" : "password"}
                  value={form.accountNumber}
                  onChange={(e) => setField("accountNumber", e.target.value.replace(/\D/g, ""))}
                  placeholder={t("accountNumberPlaceholder")}
                  maxLength={18}
                  className={`pe-10 ${errors.accountNumber ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowAccount((p) => !p)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 end-3 -translate-y-1/2"
                  aria-label={showAccount ? t("hideAccountNumber") : t("showAccountNumber")}
                >
                  {showAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.accountNumber && (
                <p className="text-xs text-red-500">{errors.accountNumber}</p>
              )}
              {!showAccount && form.accountNumber && (
                <p className="text-muted-foreground font-mono text-xs">
                  {t("accountPreview", { masked: maskAccount(form.accountNumber) })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Transfer Codes ────────────────────────────────────────────── */}
        <Card className="mb-5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="text-muted-foreground h-4 w-4" />
              {t("transferCodesTitle")}
            </CardTitle>
            <CardDescription>{t("transferCodesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            {/* IFSC */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-sm font-medium" htmlFor="ifsc">
                {t("ifscLabel")}
                <span className="text-red-500">*</span>
                <Tooltip content={t("ifscTooltip")}>
                  <HelpCircle className="text-muted-foreground ms-1 h-3.5 w-3.5" />
                </Tooltip>
              </label>
              <Input
                id="ifsc"
                value={form.ifscCode}
                onChange={(e) => setField("ifscCode", e.target.value.toUpperCase())}
                placeholder={t("ifscPlaceholder")}
                maxLength={11}
                className={`font-mono tracking-wider ${errors.ifscCode ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              />
              {errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode}</p>}
              <p className="text-muted-foreground text-xs">{t("ifscHint")}</p>
            </div>

            {/* SWIFT */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-sm font-medium" htmlFor="swift">
                {t("swiftLabel")}
                <Tooltip content={t("swiftTooltip")}>
                  <HelpCircle className="text-muted-foreground ms-1 h-3.5 w-3.5" />
                </Tooltip>
                <span className="text-muted-foreground ms-1 text-xs font-normal">
                  {t("optional")}
                </span>
              </label>
              <Input
                id="swift"
                value={form.swiftCode}
                onChange={(e) => setField("swiftCode", e.target.value.toUpperCase())}
                placeholder={t("swiftPlaceholder")}
                maxLength={11}
                className={`font-mono tracking-wider ${errors.swiftCode ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              />
              {errors.swiftCode && <p className="text-xs text-red-500">{errors.swiftCode}</p>}
              <p className="text-muted-foreground text-xs">{t("swiftHint")}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── UPI ──────────────────────────────────────────────────────── */}
        <Card className="mb-5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="text-muted-foreground h-4 w-4" />
              {t("additionalPaymentTitle")}
            </CardTitle>
            <CardDescription>{t("additionalPaymentDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm space-y-1.5">
              <label className="flex items-center gap-1 text-sm font-medium" htmlFor="upiId">
                {t("upiLabel")}
                <Tooltip content={t("upiTooltip")}>
                  <HelpCircle className="text-muted-foreground ms-1 h-3.5 w-3.5" />
                </Tooltip>
                <span className="text-muted-foreground ms-1 text-xs font-normal">
                  {t("optional")}
                </span>
              </label>
              <Input
                id="upiId"
                value={form.upiId}
                onChange={(e) => setField("upiId", e.target.value)}
                placeholder={t("upiPlaceholder")}
                className={errors.upiId ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {errors.upiId && <p className="text-xs text-red-500">{errors.upiId}</p>}
            </div>
          </CardContent>
        </Card>

        {/* ── Security notice ───────────────────────────────────────────── */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <p className="text-xs leading-relaxed text-blue-700">
            {t.rich("securityNotice", { strong: (chunks) => <strong>{chunks}</strong> })}
          </p>
        </div>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving} className="min-w-[160px]">
            {saving ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              <>
                <Save className="me-2 h-4 w-4" />
                {t("saveBankDetails")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
