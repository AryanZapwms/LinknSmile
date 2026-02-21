// app/vendor/wallet/WalletDashboardClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";

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

type LedgerEntry = {
  _id: string;
  type: "SALE" | "PAYOUT" | "REFUND" | "COMMISSION" | "ADJUSTMENT" | "RESERVE";
  amount: number;
  status: "PENDING" | "CLEARED" | "VOIDED";
  description: string;
  createdAt: string;
  referenceType?: string;
  referenceId?: string;
};

type Payout = {
  _id: string;
  amount: number;
  status: "REQUESTED" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: string;
  idempotencyKey: string;
  failureReason?: string;
};

// ─── Helper: format currency ──────────────────────────────────────────────────

function fmt(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BalanceCard({
  label,
  amount,
  currency,
  color,
  sublabel,
}: {
  label: string;
  amount: number;
  currency: string;
  color: "blue" | "green" | "yellow" | "red" | "gray";
  sublabel?: string;
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    red: "bg-red-50 border-red-200 text-red-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{fmt(amount, currency)}</p>
      {sublabel && <p className="text-xs mt-1 opacity-60">{sublabel}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CLEARED: "bg-green-100 text-green-800",
    VOIDED: "bg-gray-100 text-gray-500",
    REQUESTED: "bg-blue-100 text-blue-800",
    APPROVED: "bg-indigo-100 text-indigo-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    SALE: "bg-green-100 text-green-700",
    PAYOUT: "bg-blue-100 text-blue-700",
    REFUND: "bg-red-100 text-red-700",
    COMMISSION: "bg-orange-100 text-orange-700",
    ADJUSTMENT: "bg-purple-100 text-purple-700",
    RESERVE: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${map[type] || "bg-gray-100 text-gray-600"}`}>
      {type}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WalletDashboardClient() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<"ledger" | "payouts">("ledger");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  const fetchWallet = useCallback(async () => {
    const res = await fetch("/api/vendor/wallet");
    if (res.ok) setWallet(await res.json());
  }, []);

  const fetchLedger = useCallback(async (page = 1) => {
    const res = await fetch(`/api/vendor/wallet/ledger?limit=20&page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setLedger(data.entries || []);
      setLedgerTotal(data.total || 0);
      setLedgerPage(page);
    }
  }, []);

  const fetchPayouts = useCallback(async () => {
    const res = await fetch("/api/vendor/payouts");
    if (res.ok) {
      const data = await res.json();
      setPayouts(data.payouts || []);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchWallet(), fetchLedger(1), fetchPayouts()]);
      setLoading(false);
    }
    init();
  }, [fetchWallet, fetchLedger, fetchPayouts]);

  async function handleWithdraw() {
    const amount = parseFloat(withdrawAmount);

    if (!amount || isNaN(amount) || amount <= 0) {
      setMessage({ text: "Please enter a valid amount.", type: "error" });
      return;
    }

    if (wallet && amount < wallet.minimumWithdrawalThreshold) {
      setMessage({
        text: `Minimum withdrawal is ${fmt(wallet.minimumWithdrawalThreshold, wallet.currency)}.`,
        type: "error",
      });
      return;
    }

    if (wallet && amount > wallet.withdrawableBalance) {
      setMessage({ text: "Amount exceeds your withdrawable balance.", type: "error" });
      return;
    }

    setWithdrawing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/vendor/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "Withdrawal request submitted! Admin will process it shortly.", type: "success" });
        setWithdrawAmount("");
        // Refresh all data
        await Promise.all([fetchWallet(), fetchLedger(1), fetchPayouts()]);
      } else {
        setMessage({ text: data.error || "Withdrawal failed.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setWithdrawing(false);
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load wallet. Please refresh.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(ledgerTotal / 20);
  const canWithdraw =
    !wallet.isFrozen &&
    !wallet.isClosed &&
    wallet.withdrawableBalance >= wallet.minimumWithdrawalThreshold;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Last reconciled: {fmtDate(wallet.lastReconciledAt)}
          </p>
        </div>
        {wallet.isFrozen && (
          <span className="bg-red-100 text-red-700 text-sm font-semibold px-3 py-1.5 rounded-full">
            🔒 Wallet Frozen
          </span>
        )}
        {wallet.isClosed && (
          <span className="bg-gray-100 text-gray-600 text-sm font-semibold px-3 py-1.5 rounded-full">
            Wallet Closed
          </span>
        )}
      </div>

      {/* ── Frozen/Closed warning ── */}
      {wallet.isFrozen && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-sm text-red-800">
          <strong>⚠️ Your wallet is frozen.</strong> Withdrawals are disabled. This may be due to a
          dispute or compliance review. Contact support if you believe this is an error.
        </div>
      )}

      {/* ── Balance Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BalanceCard
          label="Total Balance"
          amount={wallet.totalBalance}
          currency={wallet.currency}
          color="blue"
          sublabel="Pending + Withdrawable"
        />
        <BalanceCard
          label="Withdrawable"
          amount={wallet.withdrawableBalance}
          currency={wallet.currency}
          color="green"
          sublabel="Ready to withdraw"
        />
        <BalanceCard
          label="Pending Clearance"
          amount={wallet.pendingBalance}
          currency={wallet.currency}
          color="yellow"
          sublabel="Clears after 7 days"
        />
        <BalanceCard
          label="Frozen / On Hold"
          amount={wallet.frozenBalance}
          currency={wallet.currency}
          color="red"
          sublabel="Disputes / reserves"
        />
      </div>

      {/* ── Withdrawal Form ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Request Withdrawal</h2>

        {message && (
          <div
            className={`text-sm rounded-lg px-4 py-3 ${
              message.type === "success"
                ? "bg-green-50 border border-green-300 text-green-800"
                : "bg-red-50 border border-red-300 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input
              type="number"
              placeholder={`Min ₹${wallet.minimumWithdrawalThreshold}`}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={!canWithdraw || withdrawing}
              className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={!canWithdraw || withdrawing || !withdrawAmount}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {withdrawing ? "Submitting..." : "Withdraw"}
          </button>
          <button
            onClick={() => setWithdrawAmount(wallet.withdrawableBalance.toString())}
            disabled={!canWithdraw}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Max
          </button>
        </div>

        {!canWithdraw && !wallet.isFrozen && !wallet.isClosed && (
          <p className="text-xs text-gray-500">
            You need at least {fmt(wallet.minimumWithdrawalThreshold, wallet.currency)} withdrawable to request a
            payout. Current: {fmt(wallet.withdrawableBalance, wallet.currency)}.
          </p>
        )}
      </div>

      {/* ── Tabs ── */}
      <div>
        <div className="flex border-b border-gray-200 mb-4">
          {(["ledger", "payouts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "ledger" ? `Transaction Ledger (${ledgerTotal})` : `Payout History (${payouts.length})`}
            </button>
          ))}
        </div>

        {/* ── Ledger Tab ── */}
        {activeTab === "ledger" && (
          <div className="space-y-4">
            {ledger.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No transactions yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">Description</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ledger.map((entry) => (
                        <tr key={entry._id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                            {fmtDate(entry.createdAt)}
                          </td>
                          <td className="py-3 pr-4">
                            <TypeBadge type={entry.type} />
                          </td>
                          <td className="py-3 pr-4 text-gray-700 max-w-xs truncate">
                            {entry.description}
                          </td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={entry.status} />
                          </td>
                          <td
                            className={`py-3 text-right font-semibold ${
                              entry.amount >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {entry.amount >= 0 ? "+" : ""}
                            {fmt(entry.amount, wallet.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => fetchLedger(ledgerPage - 1)}
                      disabled={ledgerPage === 1}
                      className="text-sm px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      ← Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {ledgerPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => fetchLedger(ledgerPage + 1)}
                      disabled={ledgerPage === totalPages}
                      className="text-sm px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Payouts Tab ── */}
        {activeTab === "payouts" && (
          <div>
            {payouts.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No payout requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Amount</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payouts.map((payout) => (
                      <tr key={payout._id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                          {fmtDate(payout.createdAt)}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-gray-800">
                          {fmt(payout.amount, wallet.currency)}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={payout.status} />
                        </td>
                        <td className="py-3 text-gray-500 text-xs">
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