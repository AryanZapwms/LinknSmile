"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  TrendingUp,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowDownToLine,
  Info, // ← Added Info import (was missing)
  Package,
  Building2,
  Receipt,
  History,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, getCurrencySymbol, LOCALE } from "@/lib/currency";

// ─── Types ───────────────────────────────────────────────────────────────────

type WalletData = {
  totalBalance: number;
  pendingBalance: number;
  withdrawableBalance: number;
  frozenBalance: number;
  minimumWithdrawalThreshold: number;
  isFrozen: boolean;
  isClosed: boolean;
  currency: string;
  lastReconciledAt: string;
};

type OrderItem = {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  platformCommission: number;
  vendorEarnings: number;
  commissionRate: number;
  size?: string;
};

type OrderBreakdown = {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  items: OrderItem[];
  summary: {
    grossAmount: number;
    platformCommission: number;
    vendorEarnings: number;
    commissionRate: number;
    settlementStatus: string;
    settlementNote: string;
  };
};

type LedgerEntry = {
  _id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
};

type Payout = {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  failureReason?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  shipped: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  released: "bg-green-100 text-green-700 border-green-200",
  held: "bg-orange-100 text-orange-700 border-orange-200",
  REQUESTED: "bg-blue-100 text-blue-700 border-blue-200",
  APPROVED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PROCESSING: "bg-purple-100 text-purple-700 border-purple-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  CLEARED: "bg-green-100 text-green-700 border-green-200",
  VOIDED: "bg-gray-100 text-gray-500 border-gray-200",
};

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: OrderBreakdown }) {
  const t = useTranslations("VendorWallet");
  const [expanded, setExpanded] = useState(false);

  const orderStatusLabels: Record<string, string> = {
    pending: t("orderStatusPending"),
    processing: t("orderStatusProcessing"),
    shipped: t("orderStatusShipped"),
    delivered: t("orderStatusDelivered"),
    cancelled: t("orderStatusCancelled"),
  };
  const settlementLabels: Record<string, string> = {
    held: t("settlementHeld"),
    pending: t("settlementPending"),
  };

  const settleBg =
    order.summary.settlementStatus === "released"
      ? "bg-green-50 border-green-100"
      : order.orderStatus === "cancelled"
        ? "bg-red-50 border-red-100"
        : "bg-yellow-50 border-yellow-100";

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Header row */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">#{order.orderNumber}</span>
            <Badge
              variant="outline"
              className={`h-5 px-1.5 text-[10px] capitalize ${statusColors[order.orderStatus]}`}
            >
              {orderStatusLabels[order.orderStatus] || order.orderStatus}
            </Badge>
            <Badge
              variant="outline"
              className={`h-5 px-1.5 text-[10px] uppercase ${statusColors[order.summary.settlementStatus]}`}
            >
              {order.summary.settlementStatus === "released"
                ? t("settlementReleased")
                : settlementLabels[order.summary.settlementStatus] ||
                  order.summary.settlementStatus}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">{fmtDate(order.orderDate)}</p>
        </div>

        {/* Summary financials */}
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="text-center">
            <p className="text-muted-foreground text-[10px] font-medium uppercase">{t("sale")}</p>
            <p className="text-sm font-bold">{formatCurrency(order.summary.grossAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-red-500 uppercase">{t("platformFee")}</p>
            <p className="text-sm font-bold text-red-600">
              −{formatCurrency(order.summary.platformCommission)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-green-600 uppercase">{t("youEarn")}</p>
            <p className="text-sm font-bold text-green-700">+{formatCurrency(order.summary.vendorEarnings)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Settlement note */}
      <div className={`flex items-center gap-2 border-t px-4 py-2 text-xs ${settleBg}`}>
        <Info className="h-3 w-3 shrink-0" />
        <span>{order.summary.settlementNote}</span>
      </div>

      {/* Expanded item breakdown */}
      {expanded && (
        <div className="bg-muted/20 space-y-3 border-t p-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {t("itemWiseBreakdown")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="pb-2 text-start font-medium">{t("colProduct")}</th>
                  <th className="pb-2 text-center font-medium">{t("colQty")}</th>
                  <th className="pb-2 text-end font-medium">{t("colUnitPrice")}</th>
                  <th className="pb-2 text-end font-medium">{t("colGross")}</th>
                  <th className="pb-2 text-end font-medium text-red-500">
                    {t("colPlatformWithRate", { rate: order.summary.commissionRate })}
                  </th>
                  <th className="pb-2 text-end font-medium text-green-600">{t("colYouEarn")}</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {order.items.map((item, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="py-3 pe-4">
                      <div className="flex items-center gap-2">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-8 w-8 shrink-0 rounded border object-cover"
                          />
                        ) : (
                          <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded border">
                            <Package className="text-muted-foreground h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="max-w-[140px] truncate font-medium">{item.productName}</p>
                          {item.size && <p className="text-muted-foreground">{item.size}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-end">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 text-end font-medium">{formatCurrency(item.totalPrice)}</td>
                    <td className="py-3 text-end text-red-600">
                      −{formatCurrency(item.platformCommission)}
                    </td>
                    <td className="py-3 text-end font-semibold text-green-600">
                      +{formatCurrency(item.vendorEarnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td colSpan={3} className="text-muted-foreground pt-3 text-start text-xs">
                    {t("orderTotal")}
                  </td>
                  <td className="pt-3 text-end">{formatCurrency(order.summary.grossAmount)}</td>
                  <td className="pt-3 text-end text-red-600">
                    −{formatCurrency(order.summary.platformCommission)}
                  </td>
                  <td className="pt-3 text-end text-green-600">
                    +{formatCurrency(order.summary.vendorEarnings)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-muted-foreground text-[10px] uppercase">{t("grossSale")}</p>
              <p className="mt-0.5 text-sm font-bold">{formatCurrency(order.summary.grossAmount)}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
              <p className="text-[10px] text-red-500 uppercase">
                {t("platformFeeWithRate", { rate: order.summary.commissionRate })}
              </p>
              <p className="mt-0.5 text-sm font-bold text-red-600">
                −{formatCurrency(order.summary.platformCommission)}
              </p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-center">
              <p className="text-[10px] text-green-600 uppercase">{t("yourNetEarnings")}</p>
              <p className="mt-0.5 text-sm font-bold text-green-700">
                +{formatCurrency(order.summary.vendorEarnings)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// HeldOrdersSection - fetches and lists only held orders
function HeldOrdersSection() {
  const t = useTranslations("VendorWallet");
  const [heldOrders, setHeldOrders] = useState<OrderBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHeldOrders() {
      try {
        const res = await fetch("/api/vendor/wallet/orders?limit=50");
        const data = await res.json();
        if (data.success) {
          const held = data.orders.filter(
            (o: OrderBreakdown) => o.summary.settlementStatus === "held"
          );
          setHeldOrders(held);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeldOrders();
  }, []);

  if (loading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (heldOrders.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4 text-orange-600" />
          {t("heldOrdersTitle", { count: heldOrders.length })}
        </CardTitle>
        <CardDescription className="text-xs">{t("heldOrdersDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {heldOrders.map((order) => (
          <div
            key={order.orderId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3"
          >
            <div>
              <p className="text-sm font-medium">#{order.orderNumber}</p>
              <p className="text-muted-foreground text-xs">{fmtDate(order.orderDate)}</p>
            </div>
            <div className="text-end">
              <p className="font-semibold text-orange-700">{formatCurrency(order.summary.vendorEarnings)}</p>
              <p className="text-[10px] text-orange-500">{t("heldAmount")}</p>
            </div>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link href={`/vendor/orders/${order.orderId}`}>{t("viewOrderArrow")}</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WalletDashboardClient() {
  const t = useTranslations("VendorWallet");
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [orders, setOrders] = useState<OrderBreakdown[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [flashMsg, setFlashMsg] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"orders" | "ledger" | "payouts">("orders");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [shopCommissionRate, setShopCommissionRate] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = useCallback(async () => {
    const res = await fetch("/api/vendor/wallet");
    if (res.ok) setWallet(await res.json());
  }, []);

  const fetchOrders = useCallback(async (page = 1) => {
    const res = await fetch(`/api/vendor/wallet/orders?page=${page}&limit=15`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
      setOrdersTotal(data.pagination?.total || 0);
      setOrdersPage(page);
      setShopCommissionRate(data.shopCommissionRate || 10);
    }
  }, []);

  const fetchLedger = useCallback(async () => {
    const res = await fetch("/api/vendor/wallet/ledger?limit=30&page=1");
    if (res.ok) {
      const data = await res.json();
      setLedger(data.entries || []);
    }
  }, []);

  const fetchPayouts = useCallback(async () => {
    const res = await fetch("/api/vendor/payouts");
    if (res.ok) {
      const data = await res.json();
      setPayouts(data.payouts || []);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchWallet(), fetchOrders(1), fetchLedger(), fetchPayouts()]);
  }, [fetchWallet, fetchOrders, fetchLedger, fetchPayouts]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  async function handleWithdraw() {
    const amount = parseFloat(withdrawAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      setFlashMsg({ text: t("invalidAmount"), type: "error" });
      return;
    }
    if (wallet && amount < wallet.minimumWithdrawalThreshold) {
      setFlashMsg({
        text: t("minimumWithdrawalIs", {
          amount: formatCurrency(wallet.minimumWithdrawalThreshold),
        }),
        type: "error",
      });
      return;
    }
    if (wallet && amount > wallet.withdrawableBalance) {
      setFlashMsg({ text: t("amountExceedsWithdrawable"), type: "error" });
      return;
    }

    setWithdrawing(true);
    setFlashMsg(null);
    try {
      const res = await fetch("/api/vendor/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok) {
        setFlashMsg({
          text: t("withdrawalSubmitted"),
          type: "success",
        });
        setWithdrawAmount("");
        await fetchAll();
      } else {
        setFlashMsg({ text: data.message || t("withdrawalFailed"), type: "error" });
      }
    } catch {
      setFlashMsg({ text: t("networkError"), type: "error" });
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="text-destructive mx-auto mb-2 h-10 w-10" />
          <p className="text-muted-foreground">{t("failedToLoadWallet")}</p>
        </div>
      </div>
    );
  }

  const canWithdraw =
    !wallet.isFrozen &&
    !wallet.isClosed &&
    wallet.withdrawableBalance >= wallet.minimumWithdrawalThreshold;
  const totalPages = Math.ceil(ordersTotal / 15);

  const ledgerTypeLabels: Record<string, string> = {
    SALE: t("ledgerTypeSale"),
    PAYOUT: t("ledgerTypePayout"),
    REFUND: t("ledgerTypeRefund"),
    COMMISSION: t("ledgerTypeCommission"),
    ADJUSTMENT: t("ledgerTypeAdjustment"),
    RESERVE: t("ledgerTypeReserve"),
  };
  const ledgerStatusLabels: Record<string, string> = {
    PENDING: t("ledgerStatusPending"),
    CLEARED: t("ledgerStatusCleared"),
    VOIDED: t("ledgerStatusVoided"),
  };
  const payoutStatusLabels: Record<string, string> = {
    REQUESTED: t("payoutStatusRequested"),
    APPROVED: t("payoutStatusApproved"),
    PROCESSING: t("payoutStatusProcessing"),
    COMPLETED: t("payoutStatusCompleted"),
    FAILED: t("payoutStatusFailed"),
    CANCELLED: t("payoutStatusCancelled"),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ─ Header ─ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("myWallet")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("refresh")}
        </Button>
      </div>

      {/* ─ Status warnings ─ */}
      {wallet.isFrozen && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">{t("walletFrozenTitle")}</p>
            <p className="mt-0.5 text-xs text-red-700">{t("walletFrozenDesc")}</p>
          </div>
        </div>
      )}

      {/* ─ Balance Cards ─ */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-primary flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
              <Wallet className="h-3.5 w-3.5" /> {t("totalBalance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatCurrency(wallet.totalBalance)}</p>
            <p className="text-muted-foreground mt-0.5 text-[10px]">{t("pendingPlusWithdrawable")}</p>
            <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>{t("totalBalanceExplainer")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-green-700 uppercase">
              <ArrowDownToLine className="h-3.5 w-3.5" /> {t("withdrawable")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(wallet.withdrawableBalance)}</p>
            <p className="mt-0.5 text-[10px] text-green-600">{t("readyToTransfer")}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-yellow-700 uppercase">
              <Clock className="h-3.5 w-3.5" /> {t("pendingClearance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-yellow-700">{formatCurrency(wallet.pendingBalance)}</p>
            <p className="mt-0.5 text-[10px] text-yellow-600">{t("clearsAfterDelivery")}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-red-600 uppercase">
              <ShieldAlert className="h-3.5 w-3.5" /> {t("onHold")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(wallet.frozenBalance)}</p>
            <p className="mt-0.5 text-[10px] text-red-500">{t("disputeReserveHold")}</p>
          </CardContent>
        </Card>
      </div>

      <HeldOrdersSection />

      {/* ─ How It Works Explainer ─ */}
      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-900">{t("howPaymentsWorkTitle")}</p>
              <p className="text-xs leading-relaxed text-blue-700">
                {t.rich("howPaymentsWorkDesc", {
                  rate: shopCommissionRate,
                  minAmount: formatCurrency(wallet.minimumWithdrawalThreshold),
                  commissionRate: (chunks) => <strong>{chunks}</strong>,
                  pending: (chunks) => <em>{chunks}</em>,
                  clears: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─ Withdrawal Panel ─ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            {t("requestBankTransfer")}
          </CardTitle>
          <CardDescription className="text-xs">{t("requestBankTransferDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flashMsg && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${flashMsg.type === "success" ? "border border-green-200 bg-green-50 text-green-800" : "border border-red-200 bg-red-50 text-red-800"}`}
            >
              {flashMsg.text}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="text-muted-foreground absolute top-1/2 start-3 -translate-y-1/2 text-sm font-medium">
                {getCurrencySymbol()}
              </span>
              <input
                type="number"
                placeholder={t("minAmountPlaceholder", {
                  amount: formatCurrency(wallet.minimumWithdrawalThreshold),
                })}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={!canWithdraw || withdrawing}
                className="border-input focus:ring-primary disabled:bg-muted w-full rounded-md border py-2.5 pe-4 ps-8 text-sm focus:ring-2 focus:outline-none disabled:cursor-not-allowed"
              />
            </div>
            <Button
              onClick={() => setWithdrawAmount(wallet.withdrawableBalance.toString())}
              disabled={!canWithdraw}
              variant="outline"
              className="shrink-0"
            >
              {t("max")}
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={!canWithdraw || withdrawing || !withdrawAmount}
              className="shrink-0"
            >
              {withdrawing ? t("submitting") : t("requestTransfer")}
            </Button>
          </div>
          {!canWithdraw && !wallet.isFrozen && !wallet.isClosed && (
            <p className="text-muted-foreground text-xs">
              {t("needMinimumWithdrawable", {
                min: formatCurrency(wallet.minimumWithdrawalThreshold),
                current: formatCurrency(wallet.withdrawableBalance),
              })}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            {t.rich("bankDetailsHint", {
              settingsLink: (chunks) => (
                <Link href="/vendor/settings" className="text-primary hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </CardContent>
      </Card>

      {/* ─ Tabs ─ */}
      <div>
        <div className="mb-0 flex gap-1 border-b">
          {[
            { id: "orders", label: t("tabOrderEarnings"), icon: Receipt },
            { id: "ledger", label: t("tabLedger"), icon: History },
            { id: "payouts", label: t("tabPayoutHistory"), icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-3 pt-4">
            <p className="text-muted-foreground text-xs">
              {t("ordersFound", { count: ordersTotal })}
            </p>
            {orders.length === 0 ? (
              <div className="text-muted-foreground py-16 text-center">
                <Receipt className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p>{t("noOrdersYet")}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {orders.map((order) => (
                    <OrderCard key={order.orderId} order={order} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchOrders(ordersPage - 1)}
                      disabled={ordersPage === 1}
                    >
                      {t("previous")}
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      {t("pageOf", { page: ordersPage, totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchOrders(ordersPage + 1)}
                      disabled={ordersPage === totalPages}
                    >
                      {t("next")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Ledger Tab */}
        {activeTab === "ledger" && (
          <div className="pt-4">
            {ledger.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center">{t("noLedgerEntries")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground bg-muted/40 border-b text-start text-xs">
                      <th className="px-4 py-3 font-medium">{t("colDate")}</th>
                      <th className="px-4 py-3 font-medium">{t("colType")}</th>
                      <th className="px-4 py-3 font-medium">{t("colDescription")}</th>
                      <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                      <th className="px-4 py-3 text-end font-medium">{t("colAmount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledger.map((entry) => (
                      <tr key={entry._id} className="hover:bg-muted/30 transition-colors">
                        <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">
                          {fmtDate(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`h-5 px-1.5 text-[10px] ${statusColors[entry.type] || "bg-gray-100 text-gray-600"}`}
                          >
                            {ledgerTypeLabels[entry.type] || entry.type}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground max-w-[200px] truncate px-4 py-3 text-xs">
                          {entry.description}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`h-5 px-1.5 text-[10px] ${statusColors[entry.status] || ""}`}
                          >
                            {ledgerStatusLabels[entry.status] || entry.status}
                          </Badge>
                        </td>
                        <td
                          className={`px-4 py-3 text-end font-semibold ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {entry.amount >= 0 ? "+" : ""}
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === "payouts" && (
          <div className="pt-4">
            {payouts.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center">{t("noPayoutRequests")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground bg-muted/40 border-b text-start text-xs">
                      <th className="px-4 py-3 font-medium">{t("colDate")}</th>
                      <th className="px-4 py-3 font-medium">{t("colAmount")}</th>
                      <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                      <th className="px-4 py-3 font-medium">{t("colNotes")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payouts.map((payout) => (
                      <tr key={payout._id} className="hover:bg-muted/30 transition-colors">
                        <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">
                          {fmtDate(payout.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(payout.amount)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`h-5 px-1.5 text-[10px] ${statusColors[payout.status] || ""}`}
                          >
                            {payoutStatusLabels[payout.status] || payout.status}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs">
                          {payout.failureReason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
