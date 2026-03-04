// app/vendor/wallet/WalletDashboardClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
  Info,
  Package,
  Building2,
  Receipt,
  History,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

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

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
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
  const [expanded, setExpanded] = useState(false);

  const settleBg =
    order.summary.settlementStatus === "released"
      ? "bg-green-50 border-green-100"
      : order.orderStatus === "cancelled"
      ? "bg-red-50 border-red-100"
      : "bg-yellow-50 border-yellow-100";

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">#{order.orderNumber}</span>
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 capitalize ${statusColors[order.orderStatus]}`}>
              {order.orderStatus}
            </Badge>
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 uppercase ${statusColors[order.summary.settlementStatus]}`}>
              {order.summary.settlementStatus === "released" ? "✓ Credited" : order.summary.settlementStatus}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(order.orderDate)}</p>
        </div>

        {/* Summary financials */}
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Sale</p>
            <p className="text-sm font-bold">{fmt(order.summary.grossAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-red-500 uppercase font-medium">Platform Fee</p>
            <p className="text-sm font-bold text-red-600">−{fmt(order.summary.platformCommission)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-green-600 uppercase font-medium">You Earn</p>
            <p className="text-sm font-bold text-green-700">+{fmt(order.summary.vendorEarnings)}</p>
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
      <div className={`px-4 py-2 text-xs border-t flex items-center gap-2 ${settleBg}`}>
        <Info className="h-3 w-3 shrink-0" />
        <span>{order.summary.settlementNote}</span>
      </div>

      {/* Expanded item breakdown */}
      {expanded && (
        <div className="border-t bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Item-wise Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Product</th>
                  <th className="pb-2 text-center font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Unit Price</th>
                  <th className="pb-2 text-right font-medium">Gross</th>
                  <th className="pb-2 text-right font-medium text-red-500">Platform ({order.summary.commissionRate}%)</th>
                  <th className="pb-2 text-right font-medium text-green-600">You Earn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="h-8 w-8 rounded object-cover border shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded border bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium truncate max-w-[140px]">{item.productName}</p>
                          {item.size && <p className="text-muted-foreground">{item.size}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{fmt(item.unitPrice)}</td>
                    <td className="py-3 text-right font-medium">{fmt(item.totalPrice)}</td>
                    <td className="py-3 text-right text-red-600">−{fmt(item.platformCommission)}</td>
                    <td className="py-3 text-right text-green-600 font-semibold">+{fmt(item.vendorEarnings)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td colSpan={3} className="pt-3 text-left text-xs text-muted-foreground">Order Total</td>
                  <td className="pt-3 text-right">{fmt(order.summary.grossAmount)}</td>
                  <td className="pt-3 text-right text-red-600">−{fmt(order.summary.platformCommission)}</td>
                  <td className="pt-3 text-right text-green-600">+{fmt(order.summary.vendorEarnings)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Gross Sale</p>
              <p className="text-sm font-bold mt-0.5">{fmt(order.summary.grossAmount)}</p>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-100 p-3 text-center">
              <p className="text-[10px] text-red-500 uppercase">Platform Fee ({order.summary.commissionRate}%)</p>
              <p className="text-sm font-bold text-red-600 mt-0.5">−{fmt(order.summary.platformCommission)}</p>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-100 p-3 text-center">
              <p className="text-[10px] text-green-600 uppercase">Your Net Earnings</p>
              <p className="text-sm font-bold text-green-700 mt-0.5">+{fmt(order.summary.vendorEarnings)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WalletDashboardClient() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [orders, setOrders] = useState<OrderBreakdown[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [flashMsg, setFlashMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
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
      setFlashMsg({ text: "Please enter a valid amount.", type: "error" });
      return;
    }
    if (wallet && amount < wallet.minimumWithdrawalThreshold) {
      setFlashMsg({ text: `Minimum withdrawal is ${fmt(wallet.minimumWithdrawalThreshold)}.`, type: "error" });
      return;
    }
    if (wallet && amount > wallet.withdrawableBalance) {
      setFlashMsg({ text: "Amount exceeds your withdrawable balance.", type: "error" });
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
        setFlashMsg({ text: "Withdrawal request submitted! Admin will process it shortly.", type: "success" });
        setWithdrawAmount("");
        await fetchAll();
      } else {
        setFlashMsg({ text: data.message || "Withdrawal failed.", type: "error" });
      }
    } catch {
      setFlashMsg({ text: "Network error. Please try again.", type: "error" });
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
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-2" />
          <p className="text-muted-foreground">Failed to load wallet. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const canWithdraw = !wallet.isFrozen && !wallet.isClosed && wallet.withdrawableBalance >= wallet.minimumWithdrawalThreshold;
  const totalPages = Math.ceil(ordersTotal / 15);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ─ Header ─ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All payments collected by the platform are settled here after fee deductions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ─ Status warnings ─ */}
      {wallet.isFrozen && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Wallet Frozen</p>
            <p className="text-xs text-red-700 mt-0.5">Withdrawals are disabled. This may be due to a dispute or compliance review. Contact support.</p>
          </div>
        </div>
      )}

      {/* ─ Balance Cards ─ */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase text-primary tracking-wider flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{fmt(wallet.totalBalance)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Pending + Withdrawable</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase text-green-700 tracking-wider flex items-center gap-1.5">
              <ArrowDownToLine className="h-3.5 w-3.5" /> Withdrawable
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-700">{fmt(wallet.withdrawableBalance)}</p>
            <p className="text-[10px] text-green-600 mt-0.5">Ready to transfer to bank</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase text-yellow-700 tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Pending Clearance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-yellow-700">{fmt(wallet.pendingBalance)}</p>
            <p className="text-[10px] text-yellow-600 mt-0.5">Clears 7 days after delivery</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase text-red-600 tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> On Hold
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-red-600">{fmt(wallet.frozenBalance)}</p>
            <p className="text-[10px] text-red-500 mt-0.5">Dispute / reserve hold</p>
          </CardContent>
        </Card>
      </div>

      {/* ─ How It Works Explainer ─ */}
      <Card className="bg-blue-50/40 border-blue-100">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-900">How payments work</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                When a customer makes a purchase, the full payment goes to the platform. After your shop's <strong>commission rate ({shopCommissionRate}%)</strong> is deducted, the remaining amount is your earnings. This amount shows as <em>Pending</em> until the order is delivered, then <strong>clears into your Withdrawable balance after 7 days</strong>. You can then request a bank transfer anytime above the ₹{wallet.minimumWithdrawalThreshold} minimum.
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
            Request Bank Transfer
          </CardTitle>
          <CardDescription className="text-xs">Transfer your withdrawable balance to your registered bank account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flashMsg && (
            <div className={`text-sm rounded-lg px-4 py-3 ${flashMsg.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
              {flashMsg.text}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">₹</span>
              <input
                type="number"
                placeholder={`Min ₹${wallet.minimumWithdrawalThreshold}`}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={!canWithdraw || withdrawing}
                className="w-full pl-8 pr-4 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
              />
            </div>
            <Button
              onClick={() => setWithdrawAmount(wallet.withdrawableBalance.toString())}
              disabled={!canWithdraw}
              variant="outline"
              className="shrink-0"
            >
              Max
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={!canWithdraw || withdrawing || !withdrawAmount}
              className="shrink-0"
            >
              {withdrawing ? "Submitting..." : "Request Transfer"}
            </Button>
          </div>
          {!canWithdraw && !wallet.isFrozen && !wallet.isClosed && (
            <p className="text-xs text-muted-foreground">
              You need at least {fmt(wallet.minimumWithdrawalThreshold)} in your withdrawable balance. Current:{" "}
              {fmt(wallet.withdrawableBalance)}.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Make sure your bank details are saved in{" "}
            <Link href="/vendor/settings" className="text-primary hover:underline">Settings</Link>{" "}
            before requesting a transfer.
          </p>
        </CardContent>
      </Card>

      {/* ─ Tabs ─ */}
      <div>
        <div className="flex gap-1 border-b mb-0">
          {[
            { id: "orders", label: "Order Earnings", icon: Receipt },
            { id: "ledger", label: "Ledger", icon: History },
            { id: "payouts", label: "Payout History", icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">{ordersTotal} orders found. Click any row to see the detailed fee breakdown.</p>
            {orders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No orders yet. Earnings will appear here once you make your first sale.</p>
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
                    <Button variant="outline" size="sm" onClick={() => fetchOrders(ordersPage - 1)} disabled={ordersPage === 1}>← Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {ordersPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => fetchOrders(ordersPage + 1)} disabled={ordersPage === totalPages}>Next →</Button>
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
              <p className="text-center text-muted-foreground py-12">No ledger entries yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground bg-muted/40 border-b">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledger.map((entry) => (
                      <tr key={entry._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{fmtDate(entry.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusColors[entry.type] || "bg-gray-100 text-gray-600"}`}>
                            {entry.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate text-xs">{entry.description}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusColors[entry.status] || ""}`}>
                            {entry.status}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {entry.amount >= 0 ? "+" : ""}{fmt(entry.amount)}
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
              <p className="text-center text-muted-foreground py-12">No payout requests yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground bg-muted/40 border-b">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payouts.map((payout) => (
                      <tr key={payout._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(payout.createdAt)}</td>
                        <td className="px-4 py-3 font-semibold">{fmt(payout.amount)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusColors[payout.status] || ""}`}>
                            {payout.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{payout.failureReason || "—"}</td>
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