// Regression tests for LedgerService transaction handling.
//
// Bug: after a successful commitTransaction(), the audit-log write sat in
// the same try block; if it threw, the catch called abortTransaction() on
// the committed transaction, which throws "Cannot call abortTransaction
// after calling commitTransaction" and masked the real error. Callers
// (e.g. fulfillPaidOrder) then logged a generic failure for a sale that
// had actually been committed.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { initModels, startTestDb, stopTestDb, trackTransactionCalls } from "./helpers/mongo";

const push = vi.hoisted(() => ({ send: vi.fn(async () => {}) }));
vi.mock("@/lib/services/push-notification", () => ({
  sendPushNotificationToVendor: push.send,
  sendPushNotificationToMultipleVendors: vi.fn(async () => {}),
}));

let LedgerService: typeof import("@/lib/services/ledger-service").LedgerService;
let AuditLog: typeof import("@/lib/models/audit-log").AuditLog;
let Wallet: typeof import("@/lib/models/wallet").Wallet;
let LedgerEntry: typeof import("@/lib/models/ledger").LedgerEntry;

beforeAll(async () => {
  await startTestDb();
  ({ LedgerService } = await import("@/lib/services/ledger-service"));
  ({ AuditLog } = await import("@/lib/models/audit-log"));
  ({ Wallet } = await import("@/lib/models/wallet"));
  ({ LedgerEntry } = await import("@/lib/models/ledger"));
  await initModels();
});

afterAll(stopTestDb);

afterEach(() => {
  vi.restoreAllMocks();
  push.send.mockReset();
  push.send.mockImplementation(async () => {});
});

const newId = () => new mongoose.Types.ObjectId().toString();

/** Asserts a commit happened and no abort followed it. */
function expectNoAbortAfterCommit(events: string[]) {
  const firstCommit = events.indexOf("commit");
  expect(firstCommit, `events: ${events.join(",")}`).toBeGreaterThanOrEqual(0);
  expect(events.slice(firstCommit)).not.toContain("abort");
}

function auditFailureLogged(errorSpy: ReturnType<typeof vi.spyOn>, context: Record<string, unknown>) {
  expect(errorSpy).toHaveBeenCalledWith(
    expect.stringContaining("AUDIT_LOG_WRITE_FAILED"),
    expect.objectContaining({
      ...context,
      error: expect.objectContaining({ message: "audit-log write failed (test)" }),
    })
  );
}

describe("LedgerService: audit-log failure after commit", () => {
  it("recordSale keeps the committed sale, never aborts after commit, and logs the real audit error", async () => {
    const shopId = newId();
    const orderId = newId();
    vi.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("audit-log write failed (test)"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tx = trackTransactionCalls();

    try {
      await expect(
        LedgerService.recordSale({
          orderId,
          items: [{ shopId, vendorEarnings: 900, commission: 100 }],
          performedBy: "user-123",
        })
      ).resolves.toBeUndefined();
    } finally {
      tx.restore();
    }

    // (a) financial writes are committed and correct
    const sale = await LedgerEntry.findOne({ referenceId: orderId, type: "SALE" }).lean();
    expect(sale).toMatchObject({ amount: 900, status: "PENDING", shopId: new mongoose.Types.ObjectId(shopId) });
    const commission = await LedgerEntry.findOne({ referenceId: orderId, type: "COMMISSION" }).lean();
    expect(commission).toMatchObject({ amount: 100, status: "CLEARED" });
    const wallet = await Wallet.findOne({ shopId, type: "VENDOR" }).lean();
    expect(wallet?.pendingBalance).toBe(900);

    // (b) no abortTransaction after the commit
    expectNoAbortAfterCommit(tx.events);

    // (c) the real error is logged with context, not masked
    auditFailureLogged(errorSpy, { orderId, performedBy: "user-123", vendorEarnings: 900, commission: 100 });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("Cannot call abortTransaction");

    // Idempotency still holds: a retry does not double-credit.
    await LedgerService.recordSale({ orderId, items: [{ shopId, vendorEarnings: 900, commission: 100 }] });
    expect(await LedgerEntry.countDocuments({ referenceId: orderId, type: "SALE" })).toBe(1);
    expect((await Wallet.findOne({ shopId, type: "VENDOR" }).lean())?.pendingBalance).toBe(900);
  });

  it("requestPayout, completePayout and rejectPayout keep committed changes when the audit write fails", async () => {
    const shopId = newId();
    await Wallet.create({ shopId, type: "VENDOR", withdrawableBalance: 2000 });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const auditCreate = vi.spyOn(AuditLog, "create");

    // requestPayout: debit committed, returned entry intact
    const payoutA = newId();
    auditCreate.mockRejectedValueOnce(new Error("audit-log write failed (test)"));
    let tx = trackTransactionCalls();
    let debit;
    try {
      debit = await LedgerService.requestPayout({ shopId, amount: 700, payoutId: payoutA, adminId: "admin-1" });
    } finally {
      tx.restore();
    }
    expect(debit).toMatchObject({ amount: -700, type: "PAYOUT" });
    expect((await Wallet.findOne({ shopId }).lean())?.withdrawableBalance).toBe(1300);
    expectNoAbortAfterCommit(tx.events);
    auditFailureLogged(errorSpy, { payoutId: payoutA, shopId, amount: 700 });

    // completePayout: entry cleared
    auditCreate.mockRejectedValueOnce(new Error("audit-log write failed (test)"));
    tx = trackTransactionCalls();
    try {
      await expect(LedgerService.completePayout(payoutA, "admin-1", "UTR123")).resolves.toBeUndefined();
    } finally {
      tx.restore();
    }
    expect((await LedgerEntry.findOne({ referenceId: payoutA, type: "PAYOUT" }).lean())?.status).toBe("CLEARED");
    expectNoAbortAfterCommit(tx.events);
    auditFailureLogged(errorSpy, { payoutId: payoutA, amount: 700, transactionRef: "UTR123" });

    // rejectPayout: reversal committed, balance restored
    const payoutB = newId();
    await LedgerService.requestPayout({ shopId, amount: 300, payoutId: payoutB });
    expect((await Wallet.findOne({ shopId }).lean())?.withdrawableBalance).toBe(1000);
    auditCreate.mockRejectedValueOnce(new Error("audit-log write failed (test)"));
    tx = trackTransactionCalls();
    try {
      await expect(LedgerService.rejectPayout(payoutB, shopId, 300, "bank failure", "admin-1")).resolves.toBeUndefined();
    } finally {
      tx.restore();
    }
    expect((await Wallet.findOne({ shopId }).lean())?.withdrawableBalance).toBe(1300);
    expect(await LedgerEntry.countDocuments({ referenceId: payoutB, type: "ADJUSTMENT" })).toBe(1);
    expectNoAbortAfterCommit(tx.events);
    auditFailureLogged(errorSpy, { payoutId: payoutB, shopId, amount: 300 });
  });

  it("clearPendingFunds counts a committed clearance as cleared even if the push notification fails", async () => {
    const shopId = newId();
    const orderId = newId();
    await LedgerService.recordSale({ orderId, items: [{ shopId, vendorEarnings: 400, commission: 50 }] });
    await LedgerEntry.updateOne({ referenceId: orderId, type: "SALE" }, { $set: { clearAt: new Date(Date.now() - 1000) } });
    push.send.mockRejectedValueOnce(new Error("push failed (test)"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tx = trackTransactionCalls();

    let result;
    try {
      result = await LedgerService.clearPendingFunds();
    } finally {
      tx.restore();
    }

    expect(result).toEqual({ cleared: 1, failed: 0 });
    expectNoAbortAfterCommit(tx.events);
    const wallet = await Wallet.findOne({ shopId, type: "VENDOR" }).lean();
    expect(wallet).toMatchObject({ pendingBalance: 0, withdrawableBalance: 400 });
  });
});

describe("LedgerService: failures inside the transaction", () => {
  it("rolls back and rethrows the ORIGINAL error (not an abort error)", async () => {
    const shopId = newId();
    const orderId = newId();
    // Make the optimistic-lock wallet update fail inside the transaction.
    vi.spyOn(Wallet, "findOneAndUpdate").mockResolvedValueOnce(null as any);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tx = trackTransactionCalls();

    try {
      await expect(
        LedgerService.recordSale({ orderId, items: [{ shopId, vendorEarnings: 900, commission: 100 }] })
      ).rejects.toThrow(/Concurrent modification on wallet/);
    } finally {
      tx.restore();
    }

    expect(tx.events).toEqual(["abort"]); // aborted once, never committed
    expect(await LedgerEntry.countDocuments({ referenceId: orderId })).toBe(0);
  });
});

describe("LedgerService.recordRefund: wallet auto-freeze audit row after commit", () => {
  // Vendor already paid out: withdrawable 100, refund 300 → negative → frozen.
  async function paidOutVendor() {
    const shopId = newId();
    await Wallet.create({ shopId, type: "VENDOR", withdrawableBalance: 100, pendingBalance: 0 });
    return shopId;
  }
  const refund = (shopId: string, refundId = newId()) =>
    LedgerService.recordRefund({
      orderId: newId(),
      refundId,
      items: [{ shopId, refundAmount: 300, commissionReversal: 0 }],
    });
  const frozenAudits = (shopId: string) =>
    AuditLog.countDocuments({ action: "WALLET_AUTO_FROZEN_NEGATIVE_BALANCE", shopId: new mongoose.Types.ObjectId(shopId) });

  it("writes the audit row once, after the refund commits", async () => {
    const shopId = await paidOutVendor();
    const refundId = newId();
    const tx = trackTransactionCalls();
    const order: string[] = [];
    const realCreate = AuditLog.create.bind(AuditLog);
    vi.spyOn(AuditLog, "create").mockImplementation(((doc: any) => {
      order.push(tx.events.includes("commit") ? "audit-after-commit" : "audit-before-commit");
      return realCreate(doc);
    }) as any);
    try {
      await refund(shopId, refundId);
    } finally {
      tx.restore();
    }
    expect(order).toEqual(["audit-after-commit"]);
    expectNoAbortAfterCommit(tx.events);
    expect((await Wallet.findOne({ shopId, type: "VENDOR" }).lean())?.status).toBe("FROZEN");
    const audit = await AuditLog.findOne({ action: "WALLET_AUTO_FROZEN_NEGATIVE_BALANCE", shopId: new mongoose.Types.ObjectId(shopId) }).lean<any>();
    expect(audit?.metadata).toMatchObject({ refundId, refundAmount: 300 });
  });

  it("a failure after the freeze step rolls everything back and leaves NO audit row", async () => {
    const shopId = await paidOutVendor();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Fail inside the transaction, after the freeze (platform wallet lookup is next).
    const realFindOne = Wallet.findOne.bind(Wallet);
    vi.spyOn(Wallet, "findOne").mockImplementation(((filter: any, ...rest: any[]) => {
      if (filter?.type === "PLATFORM_REVENUE") throw new Error("failure after freeze (test)");
      return (realFindOne as any)(filter, ...rest);
    }) as any);
    const tx = trackTransactionCalls();
    try {
      await expect(refund(shopId)).rejects.toThrow("failure after freeze (test)");
    } finally {
      tx.restore();
    }
    expect(tx.events).toEqual(["abort"]);
    expect(await frozenAudits(shopId)).toBe(0);
    const wallet = await Wallet.findOne({ shopId, type: "VENDOR" }).lean();
    expect(wallet).toMatchObject({ withdrawableBalance: 100, status: "ACTIVE" });
    expect(await LedgerEntry.countDocuments({ shopId, type: "REFUND" })).toBe(0);
  });

  it("an audit write failure after commit keeps the refund committed and logs AUDIT_LOG_WRITE_FAILED", async () => {
    const shopId = await paidOutVendor();
    const refundId = newId();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("audit-log write failed (test)"));
    const tx = trackTransactionCalls();
    try {
      await expect(refund(shopId, refundId)).resolves.toBeUndefined();
    } finally {
      tx.restore();
    }
    expectNoAbortAfterCommit(tx.events);
    expect(await LedgerEntry.countDocuments({ shopId, type: "REFUND" })).toBe(1);
    expect((await Wallet.findOne({ shopId, type: "VENDOR" }).lean())?.status).toBe("FROZEN");
    auditFailureLogged(errorSpy, { refundId, shopId, amount: 300 });
  });
});
