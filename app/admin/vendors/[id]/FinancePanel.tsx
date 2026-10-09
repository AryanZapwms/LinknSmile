"use client";

// The "Finance" tab of /admin/vendors/[id]: one vendor's wallet, ledger
// reconciliation, balance warnings, payouts, ledger entries, audit log and
// masked bank details, from GET /api/admin/vendors/:id/finance.
//
// Read-only on purpose: this panel has no actions. Payouts are handled on
// /admin/payouts; nothing here changes a balance.

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, LOCALE } from "@/lib/currency";
import type { FinanceWarning, FinanceWarningCode, Page, VendorFinance } from "@/lib/vendor-finance";

const WARNING_COPY: Record<FinanceWarningCode, { title: string; description: string }> = {
  LEDGER_MISMATCH: {
    title: "Wallet does not match the ledger",
    description: "The balances this vendor sees differ from what their ledger entries add up to.",
  },
  CANCELLED_ORDER_CREDITED: {
    title: "Cancelled orders still credited",
    description:
      "These prepaid orders were cancelled, but their earnings are still in the wallet. Refunds are not recorded in the ledger, so nothing took the money back out.",
  },
  COD_NOT_IN_WALLET: {
    title: "Cash-on-delivery earnings not in the wallet",
    description:
      "These cash-on-delivery orders are delivered and marked paid. Cash-on-delivery sales are never added to the wallet, so the vendor cannot withdraw them here.",
  },
  RELEASE_OVERDUE: {
    title: "Sales overdue for release",
    description:
      "These sales passed their release date more than two days ago and are still pending. The daily fund-release job may not be running.",
  },
  PAID_ORDER_NOT_IN_LEDGER: {
    title: "Paid orders missing from the ledger",
    description:
      "These orders were paid online but have no sale in this vendor's ledger, so their earnings never reached the wallet.",
  },
  REJECTED_PAYOUT_NOT_RESTORED: {
    title: "Rejected payouts not given back",
    description:
      "These payouts ended without being paid, but the amount taken from the wallet when they were requested was never returned.",
  },
  EXIT_SETTLEMENT_STUCK: {
    title: "Final settlement cannot be processed",
    description:
      "A final settlement was created when the vendor left, without debiting the wallet. It cannot be approved while the wallet is closed.",
  },
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" })
    : "—";
const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(LOCALE, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** "PAYOUT_INITIATED" → "Payout initiated". */
const readable = (code: string) => {
  const words = code.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

function Money({ amount, signed = false }: { amount: number; signed?: boolean }) {
  const tone = signed && amount < 0 ? "text-red-600" : signed && amount > 0 ? "text-green-700" : "";
  return <span className={`font-mono ${tone}`}>{formatCurrency(amount)}</span>;
}

function WalletStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge className="bg-green-600">Active</Badge>;
  if (status === "FROZEN") return <Badge variant="destructive">Frozen</Badge>;
  if (status === "CLOSED") return <Badge variant="secondary">Closed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function Pager({ page, onChange }: { page: Page<unknown>; onChange: (next: number) => void }) {
  if (page.pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {page.page} of {page.pages} ({page.total} in total)
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page.page <= 1}
          onClick={() => onChange(page.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page.page >= page.pages}
          onClick={() => onChange(page.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function WarningCard({ warning }: { warning: FinanceWarning }) {
  const copy = WARNING_COPY[warning.code];
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-amber-900">{copy.title}</p>
          <p className="mt-1 text-sm text-amber-900/80">{copy.description}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-mono font-semibold text-amber-900">{formatCurrency(warning.amount)}</p>
          {warning.code !== "LEDGER_MISMATCH" && (
            <p className="text-amber-900/70">
              {warning.count} {warning.count === 1 ? "item" : "items"}
            </p>
          )}
        </div>
      </div>

      {warning.code === "LEDGER_MISMATCH" && warning.details && (
        <p className="mt-2 text-sm text-amber-900/80">
          Pending is off by {formatCurrency(Number(warning.details.pendingDifference))} and
          withdrawable by {formatCurrency(Number(warning.details.withdrawableDifference))} (wallet
          minus ledger).
        </p>
      )}
      {warning.code === "EXIT_SETTLEMENT_STUCK" && warning.details && (
        <p className="mt-2 text-sm text-amber-900/80">
          Wallet status: {String(warning.details.walletStatus ?? "none")}. Withdrawable balance
          still in the wallet: {formatCurrency(Number(warning.details.walletWithdrawable ?? 0))}.
        </p>
      )}

      {warning.items.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {warning.items.map((item) => (
                <tr key={item.id} className="border-t border-amber-200">
                  <td className="py-1.5 pr-3 font-mono">{item.label}</td>
                  <td className="py-1.5 pr-3">{formatDate(item.date)}</td>
                  <td className="py-1.5 pr-3 text-amber-900/80">{item.note ?? ""}</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {warning.count > warning.items.length && (
            <p className="mt-2 text-xs text-amber-900/70">
              Showing the newest {warning.items.length} of {warning.count}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function FinancePanel({ shopId }: { shopId: string }) {
  const [finance, setFinance] = useState<VendorFinance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [reload, setReload] = useState(0);

  const load = useCallback(
    (signal: AbortSignal) =>
      fetch(
        `/api/admin/vendors/${shopId}/finance?ledgerPage=${ledgerPage}&auditPage=${auditPage}`,
        { signal }
      )
        .then(async (res) => {
          const body = await res.json().catch(() => null);
          if (!res.ok || !body?.success)
            throw new Error(body?.message || "Failed to load vendor finance");
          setFinance(body.finance);
          setError(null);
        })
        .catch((err) => {
          if (signal.aborted) return;
          setError(err instanceof Error ? err.message : "Failed to load vendor finance");
        })
        .finally(() => {
          if (!signal.aborted) setLoading(false);
        }),
    [shopId, ledgerPage, auditPage]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reload]);

  const refresh = () => {
    setLoading(true);
    setReload((n) => n + 1);
  };
  const goToLedgerPage = (page: number) => {
    setLoading(true);
    setLedgerPage(page);
  };
  const goToAuditPage = (page: number) => {
    setLoading(true);
    setAuditPage(page);
  };

  if (!finance) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm">
          {error ? (
            <div className="space-y-3">
              <p className="text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Try again
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Loading finance…</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const { wallet, reconciliation, warnings, payouts, ledger, audit, bankDetails, scan } = finance;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Read-only. Nothing on this tab changes a balance; payouts are handled on the Vendor
          Payouts page.
        </p>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600">
          Could not refresh: {error}. Showing the last loaded data.
        </p>
      )}

      {/* Balances */}
      {wallet ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Available to withdraw
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(wallet.withdrawableBalance)}</div>
              <p className="text-muted-foreground mt-1 text-xs">
                Minimum payout {formatCurrency(wallet.minimumThreshold)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(wallet.pendingBalance)}</div>
              <p className="text-muted-foreground mt-1 text-xs">Sales not yet released</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total in wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(wallet.totalBalance)}</div>
              <p className="text-muted-foreground mt-1 text-xs">Available plus pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Wallet status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WalletStatusBadge status={wallet.status} />
              <p className="text-muted-foreground mt-2 text-xs">
                {wallet.status === "ACTIVE"
                  ? "Payouts can be requested"
                  : wallet.status === "FROZEN"
                    ? "Payouts are blocked"
                    : "The vendor has left; the wallet is closed"}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-sm">
            This vendor has no wallet yet. A wallet is created with the first sale that is paid
            online.
          </CardContent>
        </Card>
      )}

      {/* Reconciliation */}
      {reconciliation && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Wallet against the ledger</CardTitle>
              {reconciliation.matches ? (
                <Badge className="bg-green-600">Matches the ledger</Badge>
              ) : (
                <Badge variant="destructive">Does not match</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Balance</th>
                    <th className="py-2 text-right">Wallet</th>
                    <th className="py-2 text-right">Ledger</th>
                    <th className="py-2 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        "Pending",
                        reconciliation.walletPending,
                        reconciliation.expectedPending,
                        reconciliation.pendingDifference,
                      ],
                      [
                        "Withdrawable",
                        reconciliation.walletWithdrawable,
                        reconciliation.expectedWithdrawable,
                        reconciliation.withdrawableDifference,
                      ],
                      [
                        "Total",
                        reconciliation.walletTotal,
                        reconciliation.expectedTotal,
                        reconciliation.totalDifference,
                      ],
                    ] as const
                  ).map(([label, inWallet, inLedger, difference]) => (
                    <tr key={label} className="border-b">
                      <td className="py-2 font-medium">{label}</td>
                      <td className="py-2 text-right">
                        <Money amount={inWallet} />
                      </td>
                      <td className="py-2 text-right">
                        <Money amount={inLedger} />
                      </td>
                      <td className="py-2 text-right">
                        <Money amount={difference} signed />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Ledger pending is the pending sales. Ledger withdrawable is every cleared entry that
              is not a payout, plus all payout entries whatever their status, because a payout is
              taken from the withdrawable balance as soon as it is requested.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      <Card>
        <CardHeader>
          <CardTitle>Balance checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {warnings.length === 0 ? (
            <p className="text-sm text-green-700">
              None of the known balance problems were found for this vendor.
            </p>
          ) : (
            warnings.map((warning) => <WarningCard key={warning.code} warning={warning} />)
          )}
          <p className="text-muted-foreground text-xs">
            {scan.limited
              ? `Checked the newest ${scan.ordersScanned} of this vendor's ${scan.ordersTotal} orders.`
              : `Checked all ${scan.ordersTotal} of this vendor's orders.`}
          </p>
        </CardContent>
      </Card>

      {/* Payouts */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Payouts</CardTitle>
            <p className="text-muted-foreground text-sm">
              In progress: {payouts.inFlight.count} ({formatCurrency(payouts.inFlight.amount)}) ·
              Completed: {payouts.completed.count} ({formatCurrency(payouts.completed.amount)})
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Requested</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 pl-4">Status</th>
                  <th className="py-2">Bank account</th>
                  <th className="py-2">Bank reference</th>
                  <th className="py-2">Wallet debit</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payouts.items.length > 0 ? (
                  payouts.items.map((payout) => (
                    <tr key={payout.id} className="border-b align-top">
                      <td className="py-2">{formatDate(payout.requestedAt)}</td>
                      <td className="py-2 text-right">
                        <Money amount={payout.amount} />
                      </td>
                      <td className="py-2 pl-4">
                        <Badge variant="outline">{readable(payout.status)}</Badge>
                        {payout.isExitSettlement && (
                          <p className="text-muted-foreground mt-1 text-xs">Final settlement</p>
                        )}
                      </td>
                      <td className="py-2">
                        {payout.bank ? (
                          <>
                            <span className="font-mono">{payout.bank.accountNumber ?? "—"}</span>
                            {payout.bank.bankName && (
                              <p className="text-muted-foreground text-xs">
                                {payout.bank.bankName}
                              </p>
                            )}
                            {payout.bankMatchesCurrent === false && (
                              <p className="text-xs text-amber-700">
                                Bank account changed since this request
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Not recorded</span>
                        )}
                      </td>
                      <td className="py-2 font-mono">{payout.bankReference ?? "—"}</td>
                      <td className="py-2">
                        {!payout.ledger.debited
                          ? "Not debited"
                          : payout.ledger.reversed
                            ? "Debited, then given back"
                            : "Debited"}
                      </td>
                      <td className="text-muted-foreground max-w-xs py-2 text-xs">
                        {payout.failureReason
                          ? `Rejected: ${payout.failureReason}`
                          : (payout.notes ?? "")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground py-6 text-center">
                      No payouts yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {payouts.total > payouts.items.length && (
            <p className="text-muted-foreground mt-3 text-xs">
              Showing the newest {payouts.items.length} of {payouts.total}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 pl-4">Description</th>
                  <th className="py-2">Release date</th>
                </tr>
              </thead>
              <tbody>
                {ledger.items.length > 0 ? (
                  ledger.items.map((entry) => (
                    <tr key={entry.id} className="border-b align-top">
                      <td className="py-2 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                      <td className="py-2">{readable(entry.type)}</td>
                      <td className="py-2">
                        <Badge variant="outline">{readable(entry.status)}</Badge>
                      </td>
                      <td className="py-2 text-right">
                        <Money amount={entry.amount} signed />
                      </td>
                      <td className="text-muted-foreground py-2 pl-4 text-xs">
                        {entry.description}
                      </td>
                      <td className="py-2 whitespace-nowrap">{formatDate(entry.clearAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground py-6 text-center">
                      No ledger entries
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager page={ledger} onChange={goToLedgerPage} />
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">When</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">By</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {audit.items.length > 0 ? (
                  audit.items.map((row) => (
                    <tr key={row.id} className="border-b align-top">
                      <td className="py-2 whitespace-nowrap">{formatDateTime(row.at)}</td>
                      <td className="py-2">{readable(row.action)}</td>
                      <td className="py-2">
                        {row.performedBy.name}
                        {row.performedBy.role && (
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            ({readable(row.performedBy.role)})
                          </span>
                        )}
                      </td>
                      <td className="text-muted-foreground max-w-xs py-2 text-xs">
                        {row.reason ?? ""}
                      </td>
                      <td className="text-muted-foreground py-2 font-mono text-xs">
                        {Object.entries(row.details)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" · ")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground py-6 text-center">
                      Nothing recorded for this vendor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager page={audit} onChange={goToAuditPage} />
          <p className="text-muted-foreground mt-3 text-xs">
            Sales and fund releases are not in this list (they are recorded without the shop); see
            the ledger above.
          </p>
        </CardContent>
      </Card>

      {/* Bank details */}
      <Card>
        <CardHeader>
          <CardTitle>Payout bank account</CardTitle>
        </CardHeader>
        <CardContent>
          {bankDetails ? (
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {(
                [
                  ["Account holder", bankDetails.accountHolderName],
                  ["Bank", bankDetails.bankName],
                  ["Account number", bankDetails.accountNumber],
                  ["IFSC", bankDetails.ifscCode],
                  ["SWIFT", bankDetails.swiftCode],
                  ["UPI", bankDetails.upiId],
                ] as const
              )
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-xs uppercase">{label}</dt>
                    <dd className="font-mono font-semibold">{value}</dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">This vendor has not added bank details.</p>
          )}
          <p className="text-muted-foreground mt-4 text-xs">
            {bankDetails && !bankDetails.isComplete
              ? "These details are incomplete: a payout cannot be requested yet. "
              : ""}
            The account number and UPI ID are masked before they leave the server.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
