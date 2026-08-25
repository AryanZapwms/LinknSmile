"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  ArrowRight,
  Wallet,
  Building2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";

interface PayoutRequest {
  _id: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  requestDate: string;
  processedDate?: string;
  transactionId?: string;
  notes?: string;
  failureReason?: string;
}

interface PayoutStats {
  availableBalance: number;
  totalEarnings: number;
  pendingPayouts: number;
  releasedPayouts: number;
  payouts: PayoutRequest[];
}

export default function VendorPayoutsPage() {
  const t = useTranslations("VendorPayouts");
  const [data, setData] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestAmount, setRequestAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const res = await fetch("/api/vendor/payouts");
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        toast.error(json.message || t("fetchFailed"));
      }
    } catch (error) {
      toast.error(t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(requestAmount);

    if (isNaN(amount) || amount < 500) {
      toast.error(t("minimumWithdrawalAmount", { amount: formatCurrency(500) }));
      return;
    }

    if (amount > (data?.availableBalance || 0)) {
      toast.error(t("amountExceedsBalance"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(t("requestSubmitted"));
        setRequestAmount("");
        fetchPayouts();
      } else {
        toast.error(json.message || t("requestFailed"));
      }
    } catch (error) {
      toast.error(t("requestFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-200 bg-yellow-100 text-yellow-700">
            {t("statusPending")}
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="border-blue-200 bg-blue-100 text-blue-700">
            {t("statusProcessing")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="border-green-200 bg-green-100 text-green-700">
            {t("statusCompleted")}
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">{t("statusFailed")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[400px] lg:col-span-1" />
          <Skeleton className="h-[400px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="text-primary h-4 w-4" />
              {t("availableBalance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.availableBalance ?? 0)}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("readyToWithdraw")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-green-600" />
              {t("totalEarnings")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.totalEarnings ?? 0)}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("allTimeRevenue")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-yellow-600" />
              {t("pendingPayouts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.pendingPayouts ?? 0)}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("underProcessing")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              {t("totalWithdrawn")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.releasedPayouts ?? 0)}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("successfullyPaid")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Request Payout Form */}
        <Card className="border-muted-foreground/10 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="text-primary h-5 w-5" />
              {t("requestWithdrawal")}
            </CardTitle>
            <CardDescription>{t("requestWithdrawalDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("amountToWithdraw")}</label>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-2.5 start-3">
                    {getCurrencySymbol()}
                  </span>
                  <Input
                    placeholder={t("minPlaceholder", { amount: 500 })}
                    className="ps-7"
                    type="number"
                    min="500"
                    max={data?.availableBalance}
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    required
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("minimumWithdrawalHint", { amount: formatCurrency(500) })}
                </p>
              </div>

              <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {t("bankDetails")}
                  </span>
                  <Link href="/vendor/settings" className="text-primary text-xs hover:underline">
                    {t("editSettings")}
                  </Link>
                </div>
                <div className="text-muted-foreground text-xs italic">
                  {t("payoutsSentToBankHint")}
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={submitting || (data?.availableBalance || 0) < 500}
                type="submit"
              >
                {submitting ? t("submitting") : t("requestPayout")}
              </Button>

              {(data?.availableBalance || 0) < 500 && (
                <div className="flex gap-2 rounded-md border border-yellow-100 bg-yellow-50 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600" />
                  <p className="text-xs text-yellow-700">
                    {t("needMinimumBalance", { amount: formatCurrency(500) })}
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="border-muted-foreground/10 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <History className="text-primary h-5 w-5" />
                {t("payoutHistory")}
              </CardTitle>
              <CardDescription>{t("payoutHistoryDesc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-start">
                    <th className="pb-3 font-medium">{t("colRequestDate")}</th>
                    <th className="pb-3 font-medium">{t("colAmount")}</th>
                    <th className="pb-3 font-medium">{t("colStatus")}</th>
                    <th className="pb-3 font-medium">{t("colTransactionId")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.payouts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground py-10 text-center">
                        {t("noPayoutHistory")}
                      </td>
                    </tr>
                  ) : (
                    data?.payouts.map((payout) => (
                      <tr key={payout._id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-4">
                          {new Date(payout.requestDate).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-4 font-medium">{formatCurrency(payout.amount)}</td>
                        <td className="py-4">{getStatusBadge(payout.status)}</td>
                        <td className="py-4">
                          {payout.transactionId ? (
                            <code className="bg-muted rounded p-1 font-mono text-xs">
                              {payout.transactionId}
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">
                              {t("pendingProcessing")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
              <Info className="h-5 w-5 shrink-0 text-blue-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">{t("importantNoteTitle")}</p>
                <p className="text-xs leading-relaxed text-blue-700">{t("importantNoteDesc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
