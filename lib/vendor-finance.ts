// lib/vendor-finance.ts
//
// One vendor's money, for the admin "Finance" tab on /admin/vendors/[id]
// (GET /api/admin/vendors/[id]/finance): the wallet, a reconciliation of the
// wallet against the ledger, payouts, warnings for the known ways a balance
// can be wrong, masked bank details, and the audit log.
//
// READ-ONLY. Nothing in this file writes: no wallet is created for a vendor
// who has none, no balance is corrected, and lib/scripts/reconcile.ts is not
// used (its per-status comparison is wrong for payouts; see reconcile()
// below). Money is only ever changed by lib/services/ledger-service.ts.
//
// Bank details are masked HERE, on the server. No value this file returns
// contains a full account number or a full UPI id.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { Wallet } from "@/lib/models/wallet";
import { LedgerEntry } from "@/lib/models/ledger";
import Payout from "@/lib/models/payout";
import { Order } from "@/lib/models/order";
import { AuditLog } from "@/lib/models/audit-log";
import { User } from "@/lib/models/user";

// ─────────────────────────────────────────────────────────────────────────────
// Masking
// ─────────────────────────────────────────────────────────────────────────────

const MASK = "••••";

/**
 * "123456789012" → "••••9012". Also accepts the snapshot a payout keeps
 * ("****9012"). Anything shorter than 8 characters shows no digits at all.
 */
export function maskAccountNumber(value: unknown): string | null {
  const text =
    typeof value === "string" || typeof value === "number" ? String(value).replace(/\s/g, "") : "";
  if (!text) return null;
  return `${MASK}${text.length >= 8 ? text.slice(-4) : ""}`;
}

/** "ashadevi@okhdfc" → "as••••@okhdfc". Short names show nothing before the mask. */
export function maskUpiId(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const [name, ...rest] = value.trim().split("@");
  const handle = rest.join("@");
  return `${name.length > 4 ? name.slice(0, 2) : ""}${MASK}${handle ? `@${handle}` : ""}`;
}

export interface MaskedBankDetails {
  accountHolderName: string | null;
  bankName: string | null;
  /** Masked: last four digits only. */
  accountNumber: string | null;
  ifscCode: string | null;
  swiftCode: string | null;
  /** Masked. */
  upiId: string | null;
  /** Enough to request a payout: holder, number, bank and an IFSC or SWIFT code. */
  isComplete: boolean;
}

export function maskBankDetails(
  bank: Record<string, unknown> | null | undefined
): MaskedBankDetails | null {
  if (!bank) return null;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  const masked: MaskedBankDetails = {
    accountHolderName: text(bank.accountHolderName),
    bankName: text(bank.bankName),
    accountNumber: maskAccountNumber(bank.accountNumber),
    ifscCode: text(bank.ifscCode),
    swiftCode: text(bank.swiftCode),
    upiId: maskUpiId(bank.upiId),
    isComplete: false,
  };
  masked.isComplete = !!(
    masked.accountHolderName &&
    masked.accountNumber &&
    masked.bankName &&
    (masked.ifscCode || masked.swiftCode)
  );
  const hasAnything = Object.entries(masked).some(
    ([key, value]) => key !== "isComplete" && value !== null
  );
  return hasAnything ? masked : null;
}

/** Replaces every occurrence of `secrets` inside any string of `value` (deeply). */
function redact<T>(value: T, secrets: Array<{ full: string; masked: string }>): T {
  if (typeof value === "string") {
    let text: string = value;
    for (const { full, masked } of secrets) text = text.split(full).join(masked);
    return text as unknown as T;
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets)) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redact(item, secrets)])
    ) as T;
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.005;

/** Ledger entries of one wallet, summed per type and status. */
export interface LedgerBucket {
  type: string;
  status: string;
  count: number;
  total: number;
}

export interface Reconciliation {
  /** What the ledger says each balance should be. */
  expectedPending: number;
  expectedWithdrawable: number;
  expectedTotal: number;
  /** What the wallet says (the cached numbers vendors see and withdraw from). */
  walletPending: number;
  walletWithdrawable: number;
  walletTotal: number;
  /** wallet − expected. */
  pendingDifference: number;
  withdrawableDifference: number;
  totalDifference: number;
  /** Ledger amounts that belong to neither balance (none are written today). */
  unclassified: number;
  matches: boolean;
  buckets: LedgerBucket[];
}

/**
 * Compares a wallet's cached balances with its ledger.
 *
 *   expected pending      = PENDING SALE entries
 *   expected withdrawable = CLEARED entries that are not payouts
 *                         + ALL payout entries, whatever their status
 *
 * Payouts are counted against withdrawable whatever their status because
 * that is where the money leaves from: a payout is debited from the
 * withdrawable balance the moment it is requested, while its ledger entry
 * stays PENDING until the bank transfer is confirmed (and stays PENDING for
 * good if the payout is rejected, next to the CLEARED entry that gives the
 * money back). Comparing "all PENDING entries" with the pending balance, as
 * LedgerService.computeBalanceFromLedger and lib/scripts/reconcile.ts do,
 * therefore reports a difference for every wallet that has, or ever had, a
 * payout. VOIDED entries count for nothing.
 */
export function reconcile(
  wallet: { pendingBalance?: number; withdrawableBalance?: number },
  buckets: LedgerBucket[]
): Reconciliation {
  let expectedPending = 0;
  let expectedWithdrawable = 0;
  let unclassified = 0;

  for (const bucket of buckets) {
    if (bucket.status === "VOIDED") continue;
    if (bucket.type === "PAYOUT") expectedWithdrawable += bucket.total;
    else if (bucket.status === "CLEARED") expectedWithdrawable += bucket.total;
    else if (bucket.type === "SALE" && bucket.status === "PENDING") expectedPending += bucket.total;
    else unclassified += bucket.total;
  }

  const walletPending = wallet.pendingBalance ?? 0;
  const walletWithdrawable = wallet.withdrawableBalance ?? 0;
  const expectedTotal = expectedPending + expectedWithdrawable + unclassified;

  return {
    expectedPending: round2(expectedPending),
    expectedWithdrawable: round2(expectedWithdrawable),
    expectedTotal: round2(expectedTotal),
    walletPending: round2(walletPending),
    walletWithdrawable: round2(walletWithdrawable),
    walletTotal: round2(walletPending + walletWithdrawable),
    pendingDifference: round2(walletPending - expectedPending),
    withdrawableDifference: round2(walletWithdrawable - expectedWithdrawable),
    totalDifference: round2(walletPending + walletWithdrawable - expectedTotal),
    unclassified: round2(unclassified),
    matches:
      sameAmount(walletPending, expectedPending) &&
      sameAmount(walletWithdrawable, expectedWithdrawable),
    buckets: buckets.map((bucket) => ({ ...bucket, total: round2(bucket.total) })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FinanceWarningCode =
  /** The wallet's balances do not match its ledger. */
  | "LEDGER_MISMATCH"
  /** A prepaid order was cancelled but its sale is still in the wallet (no refund is ever recorded). */
  | "CANCELLED_ORDER_CREDITED"
  /** A delivered, paid cash-on-delivery order whose earnings never reached the wallet. */
  | "COD_NOT_IN_WALLET"
  /** Sales past their release date that are still pending: the fund-release job is not running. */
  | "RELEASE_OVERDUE"
  /** An order paid online that has no sale in the ledger (the ledger write failed). */
  | "PAID_ORDER_NOT_IN_LEDGER"
  /** A payout that ended without paying, whose debit was never given back. */
  | "REJECTED_PAYOUT_NOT_RESTORED"
  /** A final settlement that was never debited and cannot be approved. */
  | "EXIT_SETTLEMENT_STUCK";

export interface FinanceWarningItem {
  id: string;
  /** Order number, or a payout's short id. */
  label: string;
  amount: number;
  date: string | null;
  note?: string;
}

export interface FinanceWarning {
  code: FinanceWarningCode;
  /** The money involved. */
  amount: number;
  count: number;
  /** The first MAX_WARNING_ITEMS, newest first. */
  items: FinanceWarningItem[];
  details?: Record<string, string | number | boolean | null>;
}

export interface FinanceWallet {
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  currency: string;
  pendingBalance: number;
  withdrawableBalance: number;
  /** pending + withdrawable. */
  totalBalance: number;
  minimumThreshold: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FinancePayout {
  id: string;
  amount: number;
  status: string;
  requestedAt: string | null;
  approvedAt: string | null;
  processedAt: string | null;
  /** The bank's reference for the transfer, entered when the payout was completed. */
  bankReference: string | null;
  failureReason: string | null;
  notes: string | null;
  isExitSettlement: boolean;
  /** The account the payout was requested for, as recorded then (masked). */
  bank: { accountNumber: string | null; ifscCode: string | null; bankName: string | null } | null;
  /** False when the vendor's bank account has changed since the request; null when unknown. */
  bankMatchesCurrent: boolean | null;
  ledger: {
    /** The wallet was debited for this payout. */
    debited: boolean;
    debitStatus: string | null;
    /** The debit was given back (the payout was rejected after approval). */
    reversed: boolean;
  };
}

export interface FinanceLedgerEntry {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  clearAt: string | null;
  createdAt: string | null;
}

export interface FinanceAuditRow {
  id: string;
  action: string;
  at: string | null;
  /** A user's name and role, or "SYSTEM". */
  performedBy: { id: string | null; name: string; role: string | null };
  targetEntity: string;
  targetId: string | null;
  reason: string | null;
  /** A few known, harmless fields from the row's before / after / metadata. */
  details: Record<string, string | number | boolean>;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface VendorFinance {
  shop: {
    id: string;
    shopName: string;
    isApproved: boolean;
    isActive: boolean;
    commissionRate: number;
  };
  /** null: this vendor has no wallet yet (none is created by looking). */
  wallet: FinanceWallet | null;
  reconciliation: Reconciliation | null;
  payouts: {
    /** Newest first, at most MAX_PAYOUTS. */
    items: FinancePayout[];
    total: number;
    inFlight: { count: number; amount: number };
    completed: { count: number; amount: number };
  };
  warnings: FinanceWarning[];
  bankDetails: MaskedBankDetails | null;
  ledger: Page<FinanceLedgerEntry>;
  audit: Page<FinanceAuditRow>;
  /** How much of the vendor's order history the warnings looked at. */
  scan: { ordersScanned: number; ordersTotal: number; limited: boolean };
}

export interface VendorFinanceOptions {
  ledgerPage?: number;
  ledgerLimit?: number;
  auditPage?: number;
  auditLimit?: number;
  /** For tests: the moment "now" is. */
  now?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Limits
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_WARNING_ITEMS = 10;
/** Payouts loaded per vendor (newest first). */
export const MAX_PAYOUTS = 200;
/** Orders the warnings look at per vendor (newest first). */
export const MAX_ORDERS_SCANNED = 5000;
/**
 * A sale is "overdue for release" once it is this long past its release date.
 * The fund-release job runs once a day, so anything younger is normal.
 */
export const RELEASE_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

const IN_FLIGHT = ["REQUESTED", "APPROVED", "PROCESSING"];
/** Ended without the money being sent. */
const ENDED_UNPAID = ["FAILED", "CANCELLED"];

const iso = (value: unknown): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const pageNumber = (value: unknown) => Math.max(1, Math.floor(Number(value)) || 1);
const pageSize = (value: unknown) =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(value)) || DEFAULT_PAGE_SIZE));
const pages = (total: number, limit: number) => Math.max(1, Math.ceil(total / limit));
const newestFirst = (a: FinanceWarningItem, b: FinanceWarningItem) =>
  (b.date ?? "").localeCompare(a.date ?? "");

function warning(
  code: FinanceWarningCode,
  items: FinanceWarningItem[],
  details?: FinanceWarning["details"]
): FinanceWarning {
  const sorted = [...items].sort(newestFirst);
  return {
    code,
    amount: round2(sorted.reduce((sum, item) => sum + item.amount, 0)),
    count: sorted.length,
    items: sorted
      .slice(0, MAX_WARNING_ITEMS)
      .map((item) => ({ ...item, amount: round2(item.amount) })),
    ...(details ? { details } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit rows
// ─────────────────────────────────────────────────────────────────────────────

// Audit rows keep whole "before"/"after" documents and free-form metadata.
// Only these fields are passed on; everything else stays on the server.
const AUDIT_METADATA_FIELDS = [
  "amount",
  "transactionRef",
  "restoredTo",
  "settledAmount",
  "hasSettlementPayout",
  "refundAmount",
  "refundId",
  "orderId",
  "mouVersion",
];
const AUDIT_STATE_FIELDS = ["withdrawableBalance", "pendingBalance", "status", "expiryDate"];

function auditDetails(row: Record<string, any>): FinanceAuditRow["details"] {
  const details: FinanceAuditRow["details"] = {};
  const take = (source: unknown, fields: string[], prefix: string) => {
    if (!source || typeof source !== "object") return;
    for (const field of fields) {
      let value = (source as Record<string, unknown>)[field];
      if (value instanceof Date) value = value.toISOString();
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        details[`${prefix}${field}`] = value;
      }
    }
  };
  take(row.metadata, AUDIT_METADATA_FIELDS, "");
  take(row.before, AUDIT_STATE_FIELDS, "before.");
  take(row.after, AUDIT_STATE_FIELDS, "after.");
  return details;
}

// ─────────────────────────────────────────────────────────────────────────────
// The view
// ─────────────────────────────────────────────────────────────────────────────

/** Everything the Finance tab shows for one shop, or null when the shop does not exist. */
export async function getVendorFinance(
  shopId: string,
  options: VendorFinanceOptions = {}
): Promise<VendorFinance | null> {
  if (!mongoose.isValidObjectId(shopId)) return null;
  await connectDB();

  const shop = await Shop.findById(shopId)
    .select("shopName isApproved isActive commissionRate bankDetails")
    .lean<Record<string, any>>();
  if (!shop) return null;

  const shopObjectId = new mongoose.Types.ObjectId(shopId);
  const now = options.now ?? new Date();
  const ledgerPage = pageNumber(options.ledgerPage);
  const ledgerLimit = pageSize(options.ledgerLimit);
  const auditPage = pageNumber(options.auditPage);
  const auditLimit = pageSize(options.auditLimit);

  // Found, never created: a vendor with no sales has no wallet, and looking
  // at this tab must not change that.
  const walletDoc = await Wallet.findOne({ shopId: shopObjectId, type: "VENDOR" }).lean<
    Record<string, any>
  >();
  const accountId = walletDoc?._id ?? null;

  // ── Ledger ────────────────────────────────────────────────────────────────
  const [buckets, saleRows, payoutRows, refundEntries, ledgerTotal, ledgerDocs, overdueRows] =
    accountId
      ? await Promise.all([
          LedgerEntry.aggregate<LedgerBucket>([
            { $match: { accountId } },
            {
              $group: {
                _id: { type: "$type", status: "$status" },
                count: { $sum: 1 },
                total: { $sum: "$amount" },
              },
            },
            { $project: { _id: 0, type: "$_id.type", status: "$_id.status", count: 1, total: 1 } },
            { $sort: { type: 1, status: 1 } },
          ]),
          // Sales per order (one entry is written per order line).
          LedgerEntry.aggregate<{ _id: string; total: number; pending: number; cleared: number }>([
            {
              $match: {
                accountId,
                type: "SALE",
                status: { $ne: "VOIDED" },
                referenceType: "ORDER",
              },
            },
            {
              $group: {
                _id: "$referenceId",
                total: { $sum: "$amount" },
                pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0] } },
                cleared: { $sum: { $cond: [{ $eq: ["$status", "CLEARED"] }, "$amount", 0] } },
              },
            },
          ]),
          // Payout debits, and the entries that give a rejected payout back.
          LedgerEntry.find({ accountId, referenceType: "PAYOUT", status: { $ne: "VOIDED" } })
            .select("referenceId type amount status")
            .lean<Array<Record<string, any>>>(),
          LedgerEntry.countDocuments({ accountId, type: "REFUND" }),
          LedgerEntry.countDocuments({ accountId }),
          LedgerEntry.find({ accountId })
            .sort({ createdAt: -1, _id: -1 })
            .skip((ledgerPage - 1) * ledgerLimit)
            .limit(ledgerLimit)
            .lean<Array<Record<string, any>>>(),
          LedgerEntry.aggregate<{ _id: string; amount: number; clearAt: Date }>([
            {
              $match: {
                accountId,
                type: "SALE",
                status: "PENDING",
                clearAt: { $lt: new Date(now.getTime() - RELEASE_GRACE_MS) },
              },
            },
            {
              $group: {
                _id: "$referenceId",
                amount: { $sum: "$amount" },
                clearAt: { $min: "$clearAt" },
              },
            },
          ]),
        ])
      : [[], [], [], 0, 0, [], []];

  const salesByOrder = new Map(saleRows.map((row) => [String(row._id), row]));
  const payoutLedger = new Map<string, { debit: Record<string, any> | null; reversed: boolean }>();
  for (const entry of payoutRows) {
    const key = String(entry.referenceId);
    const known = payoutLedger.get(key) ?? { debit: null, reversed: false };
    if (entry.type === "PAYOUT") known.debit = entry;
    else if (entry.type === "ADJUSTMENT" && entry.amount > 0) known.reversed = true;
    payoutLedger.set(key, known);
  }

  // ── Orders, payouts, audit ────────────────────────────────────────────────
  const [orders, ordersTotal, payoutDocs, payoutsTotal, auditTotal, auditDocs] = await Promise.all([
    Order.find({ "items.shopId": shopObjectId })
      .select(
        "orderNumber orderStatus paymentStatus paymentMethod createdAt items.shopId items.vendorEarnings"
      )
      .sort({ createdAt: -1 })
      .limit(MAX_ORDERS_SCANNED)
      .lean<Array<Record<string, any>>>(),
    Order.countDocuments({ "items.shopId": shopObjectId }),
    Payout.find({ shopId: shopObjectId })
      .sort({ createdAt: -1 })
      .limit(MAX_PAYOUTS)
      .lean<Array<Record<string, any>>>(),
    Payout.countDocuments({ shopId: shopObjectId }),
    AuditLog.countDocuments({ shopId: shopObjectId }),
    AuditLog.find({ shopId: shopObjectId })
      .sort({ createdAt: -1, _id: -1 })
      .skip((auditPage - 1) * auditLimit)
      .limit(auditLimit)
      .lean<Array<Record<string, any>>>(),
  ]);

  const ordersById = new Map(orders.map((order) => [String(order._id), order]));
  /** This shop's share of an order. */
  const earningsOf = (order: Record<string, any>) =>
    (order.items ?? [])
      .filter((item: any) => item.shopId && String(item.shopId) === shopId)
      .reduce((sum: number, item: any) => sum + (Number(item.vendorEarnings) || 0), 0);
  const orderItem = (
    order: Record<string, any>,
    amount: number,
    note?: string
  ): FinanceWarningItem => ({
    id: String(order._id),
    label: order.orderNumber ?? String(order._id),
    amount,
    date: iso(order.createdAt),
    ...(note ? { note } : {}),
  });

  // ── Warnings ──────────────────────────────────────────────────────────────
  const reconciliation = walletDoc ? reconcile(walletDoc, buckets) : null;
  const warnings: FinanceWarning[] = [];

  if (reconciliation && !reconciliation.matches) {
    warnings.push({
      code: "LEDGER_MISMATCH",
      amount: round2(
        Math.abs(reconciliation.pendingDifference) + Math.abs(reconciliation.withdrawableDifference)
      ),
      count: 1,
      items: [],
      details: {
        pendingDifference: reconciliation.pendingDifference,
        withdrawableDifference: reconciliation.withdrawableDifference,
        totalDifference: reconciliation.totalDifference,
      },
    });
  }

  const cancelledCredited: FinanceWarningItem[] = [];
  const codMissing: FinanceWarningItem[] = [];
  const paidMissing: FinanceWarningItem[] = [];
  for (const order of orders) {
    const sale = salesByOrder.get(String(order._id));
    const earnings = earningsOf(order);
    const cancelled = order.orderStatus === "cancelled";
    const paid = order.paymentStatus === "completed";
    const cod = order.paymentMethod === "cod";

    if (cancelled && sale && !sameAmount(sale.total, 0)) {
      const note = sameAmount(sale.pending, 0)
        ? "Already released to the withdrawable balance"
        : "Still pending; it will be released on its release date";
      cancelledCredited.push(orderItem(order, sale.total, note));
    } else if (!cancelled && paid && !sale && earnings > 0) {
      if (!cod) paidMissing.push(orderItem(order, earnings));
      else if (order.orderStatus === "delivered") codMissing.push(orderItem(order, earnings));
    }
  }
  if (cancelledCredited.length) {
    // No refund is ever written to the ledger (LedgerService.recordRefund has
    // no caller), so a cancelled order's sale stays where it is.
    warnings.push(warning("CANCELLED_ORDER_CREDITED", cancelledCredited, { refundEntries }));
  }
  if (codMissing.length) warnings.push(warning("COD_NOT_IN_WALLET", codMissing));
  if (paidMissing.length) warnings.push(warning("PAID_ORDER_NOT_IN_LEDGER", paidMissing));

  if (overdueRows.length) {
    const items = overdueRows.map((row): FinanceWarningItem => {
      const order = ordersById.get(String(row._id));
      return {
        id: String(row._id),
        label: order?.orderNumber ?? String(row._id),
        amount: row.amount,
        // When it should have been released.
        date: iso(row.clearAt),
        ...(order ? { note: `Order is ${order.orderStatus}` } : {}),
      };
    });
    warnings.push(warning("RELEASE_OVERDUE", items));
  }

  const notRestored: FinanceWarningItem[] = [];
  const exitStuck: FinanceWarningItem[] = [];
  for (const payout of payoutDocs) {
    const ledger = payoutLedger.get(String(payout._id));
    const item = (note?: string): FinanceWarningItem => ({
      id: String(payout._id),
      label: `Payout ${String(payout._id).slice(-6)}`,
      amount: Number(payout.amount) || 0,
      date: iso(payout.createdAt),
      ...(note ? { note } : {}),
    });
    if (ENDED_UNPAID.includes(payout.status) && ledger?.debit && !ledger.reversed) {
      notRestored.push(
        item(payout.failureReason ? `Reason given: ${payout.failureReason}` : undefined)
      );
    }
    if (payout.isExitSettlement && IN_FLIGHT.includes(payout.status) && !ledger?.debit) {
      exitStuck.push(item());
    }
  }
  if (notRestored.length) warnings.push(warning("REJECTED_PAYOUT_NOT_RESTORED", notRestored));
  if (exitStuck.length) {
    warnings.push(
      warning("EXIT_SETTLEMENT_STUCK", exitStuck, {
        walletStatus: walletDoc?.status ?? null,
        walletWithdrawable: walletDoc ? round2(walletDoc.withdrawableBalance ?? 0) : null,
      })
    );
  }

  // ── Payouts ───────────────────────────────────────────────────────────────
  const currentLast4 =
    typeof shop.bankDetails?.accountNumber === "string"
      ? shop.bankDetails.accountNumber.slice(-4)
      : null;
  const sumOf = (statuses: string[]) => {
    const matching = payoutDocs.filter((payout) => statuses.includes(payout.status));
    return {
      count: matching.length,
      amount: round2(matching.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)),
    };
  };
  const payouts: FinancePayout[] = payoutDocs.map((payout) => {
    const ledger = payoutLedger.get(String(payout._id));
    const snapshot = typeof payout.bankAccountNumber === "string" ? payout.bankAccountNumber : null;
    return {
      id: String(payout._id),
      amount: round2(Number(payout.amount) || 0),
      status: payout.status,
      requestedAt: iso(payout.createdAt),
      approvedAt: iso(payout.approvedAt),
      processedAt: iso(payout.processedAt),
      bankReference: payout.transactionId ?? null,
      failureReason: payout.failureReason ?? null,
      notes: payout.notes ?? null,
      isExitSettlement: !!payout.isExitSettlement,
      bank:
        snapshot || payout.bankIfsc || payout.bankName
          ? {
              accountNumber: maskAccountNumber(snapshot),
              ifscCode: payout.bankIfsc ?? null,
              bankName: payout.bankName ?? null,
            }
          : null,
      bankMatchesCurrent:
        snapshot && snapshot.length >= 8 && currentLast4
          ? snapshot.slice(-4) === currentLast4
          : null,
      ledger: {
        debited: !!ledger?.debit,
        debitStatus: ledger?.debit?.status ?? null,
        reversed: !!ledger?.reversed,
      },
    };
  });

  // ── Audit rows: who did it ────────────────────────────────────────────────
  const performerIds = [
    ...new Set(
      auditDocs
        .map((row) => String(row.performedBy ?? ""))
        .filter((id) => mongoose.isValidObjectId(id))
    ),
  ];
  const performers = performerIds.length
    ? await User.find({ _id: { $in: performerIds } })
        .select("name role")
        .lean<Array<Record<string, any>>>()
    : [];
  const performerById = new Map(performers.map((user) => [String(user._id), user]));
  const audit: FinanceAuditRow[] = auditDocs.map((row) => {
    const performerId = String(row.performedBy ?? "");
    const user = performerById.get(performerId);
    return {
      id: String(row._id),
      action: row.action,
      at: iso(row.createdAt),
      performedBy: user
        ? { id: performerId, name: user.name ?? "Unknown user", role: user.role ?? null }
        : {
            id: mongoose.isValidObjectId(performerId) ? performerId : null,
            name: performerId === "SYSTEM" ? "SYSTEM" : "Unknown user",
            role: null,
          },
      targetEntity: row.targetEntity,
      targetId: row.targetId ? String(row.targetId) : null,
      reason: row.reason ?? null,
      details: auditDetails(row),
    };
  });

  const view: VendorFinance = {
    shop: {
      id: shopId,
      shopName: shop.shopName,
      isApproved: !!shop.isApproved,
      isActive: !!shop.isActive,
      commissionRate: Number(shop.commissionRate) || 0,
    },
    wallet: walletDoc
      ? {
          status: walletDoc.status,
          currency: walletDoc.currency,
          pendingBalance: round2(walletDoc.pendingBalance ?? 0),
          withdrawableBalance: round2(walletDoc.withdrawableBalance ?? 0),
          totalBalance: round2(
            (walletDoc.pendingBalance ?? 0) + (walletDoc.withdrawableBalance ?? 0)
          ),
          minimumThreshold: walletDoc.minimumThreshold ?? 0,
          createdAt: iso(walletDoc.createdAt),
          updatedAt: iso(walletDoc.updatedAt),
        }
      : null,
    reconciliation,
    payouts: {
      items: payouts,
      total: payoutsTotal,
      inFlight: sumOf(IN_FLIGHT),
      completed: sumOf(["COMPLETED"]),
    },
    warnings,
    bankDetails: maskBankDetails(shop.bankDetails),
    ledger: {
      items: ledgerDocs.map((entry) => ({
        id: String(entry._id),
        type: entry.type,
        status: entry.status,
        amount: round2(entry.amount),
        description: entry.description ?? "",
        referenceType: entry.referenceType ?? null,
        referenceId: entry.referenceId ?? null,
        clearAt: iso(entry.clearAt),
        createdAt: iso(entry.createdAt),
      })),
      total: ledgerTotal,
      page: ledgerPage,
      pages: pages(ledgerTotal, ledgerLimit),
      limit: ledgerLimit,
    },
    audit: {
      items: audit,
      total: auditTotal,
      page: auditPage,
      pages: pages(auditTotal, auditLimit),
      limit: auditLimit,
    },
    scan: { ordersScanned: orders.length, ordersTotal, limited: ordersTotal > orders.length },
  };

  // Last line of defence: admins and vendors type free text (rejection
  // reasons, payout notes) that ends up in the lists above. If the current
  // account number or UPI id was typed into any of it, it is masked here too.
  const secrets: Array<{ full: string; masked: string }> = [];
  const accountNumber =
    typeof shop.bankDetails?.accountNumber === "string"
      ? shop.bankDetails.accountNumber.trim()
      : "";
  if (accountNumber.length >= 8)
    secrets.push({ full: accountNumber, masked: maskAccountNumber(accountNumber)! });
  const upiId = typeof shop.bankDetails?.upiId === "string" ? shop.bankDetails.upiId.trim() : "";
  if (upiId) secrets.push({ full: upiId, masked: maskUpiId(upiId)! });
  return secrets.length ? redact(view, secrets) : view;
}
