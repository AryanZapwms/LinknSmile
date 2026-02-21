/**
 * LedgerService — Double-Entry Accounting Core
 *
 * Rules:
 * - NEVER mutate wallet balance directly. Only via this service.
 * - EVERY wallet change creates a ledger entry first.
 * - Wallet aggregate is cache — ledger is the truth.
 * - All multi-step operations run in MongoDB sessions (ACID).
 * - Idempotency enforced via unique transactionId / referenceId.
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import { Wallet, IWallet } from '../models/wallet';
import { LedgerEntry } from '../models/ledger';
import { AuditLog } from '../models/audit-log';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateIdempotencyKey(...parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

async function getOrCreateVendorWallet(
  shopId: string,
  session: mongoose.ClientSession
): Promise<IWallet> {
  let wallet = await Wallet.findOne({ shopId, type: 'VENDOR' }).session(session) as IWallet | null;
  if (!wallet) {
    const created = await Wallet.create([{ shopId, type: 'VENDOR' }], { session });
    wallet = created[0].toObject() as IWallet;
  }
  if (!wallet) throw new Error(`Cannot find or create wallet for shop ${shopId}`);
  return wallet;
}

async function getOrCreatePlatformWallet(
  session: mongoose.ClientSession
): Promise<IWallet> {
  let platformWallet = await Wallet.findOne({ type: 'PLATFORM_REVENUE' }).session(session) as IWallet | null;
  if (!platformWallet) {
    const platformShopId = new mongoose.Types.ObjectId('000000000000000000000001');
    const created = await Wallet.create(
      [{ shopId: platformShopId, type: 'PLATFORM_REVENUE' }],
      { session }
    );
    platformWallet = created[0].toObject() as IWallet;
  }
  if (!platformWallet) throw new Error('Cannot find or create platform wallet');
  return platformWallet;
}

// ─────────────────────────────────────────────────────────────────────────────
// LedgerService
// ─────────────────────────────────────────────────────────────────────────────

export class LedgerService {
  /**
   * Called when an order is placed and payment is confirmed.
   * Credits vendor pending balance. Deducts commission to platform.
   * Idempotent — safe to retry on failure.
   */
  static async recordSale(params: {
    orderId: string;
    items: Array<{ shopId: string; vendorEarnings: number; commission: number }>;
    performedBy?: string;
  }) {
    const transactionId = generateIdempotencyKey('SALE', params.orderId);

    // Idempotency check — if already recorded, skip
    const existing = await LedgerEntry.findOne({ transactionId, type: 'SALE' });
    if (existing) {
      console.log(`[LedgerService] Sale ${params.orderId} already recorded. Skipping.`);
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const item of params.items) {
        const wallet = await getOrCreateVendorWallet(item.shopId, session);
        const platformWallet = await getOrCreatePlatformWallet(session);

        // 1. Credit vendor pending balance
        const vendorEntry = new LedgerEntry({
          transactionId,
          accountId: wallet._id,
          shopId: item.shopId,
          amount: item.vendorEarnings,
          type: 'SALE',
          status: 'PENDING',
          description: `Vendor earnings from Order #${params.orderId}`,
          referenceId: params.orderId,
          referenceType: 'ORDER',
          clearAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // T+7
        });
        await vendorEntry.save({ session });

        // Update wallet cache (pending increases)
        const walletUpdate = await Wallet.findOneAndUpdate(
          { _id: wallet._id, version: wallet.version },
          {
            $inc: { pendingBalance: item.vendorEarnings, version: 1 },
            $set: { updatedAt: new Date() },
          },
          { session, new: true }
        );

        if (!walletUpdate) {
          throw new Error(`Concurrent modification on wallet for shop ${item.shopId}. Retry.`);
        }

        // 2. Platform commission
        const commissionEntry = new LedgerEntry({
          transactionId: generateIdempotencyKey('COMMISSION', params.orderId, item.shopId),
          accountId: platformWallet._id,
          amount: item.commission,
          type: 'COMMISSION',
          status: 'CLEARED',
          description: `Platform commission from Order #${params.orderId} (Shop: ${item.shopId})`,
          referenceId: params.orderId,
          referenceType: 'ORDER',
        });
        await commissionEntry.save({ session });

        await Wallet.updateOne(
          { _id: platformWallet._id },
          { $inc: { withdrawableBalance: item.commission, version: 1 } },
          { session }
        );
      }

      await session.commitTransaction();

      await AuditLog.create({
        action: 'SALE_RECORDED',
        performedBy: params.performedBy || 'SYSTEM',
        targetEntity: 'Order',
        targetId: params.orderId,
        metadata: { items: params.items },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Called by admin to approve a payout.
   * Deducts withdrawable balance, creates PAYOUT ledger entry.
   * Idempotent — safe to retry.
   */
  static async requestPayout(params: {
    shopId: string;
    amount: number;
    payoutId: string;
    adminId?: string;
  }) {
    const transactionId = generateIdempotencyKey('PAYOUT', params.payoutId);

    // Idempotency check
    const existing = await LedgerEntry.findOne({ transactionId, type: 'PAYOUT' });
    if (existing) {
      console.log(`[LedgerService] Payout ${params.payoutId} already recorded. Skipping.`);
      return existing;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await Wallet.findOne({ shopId: params.shopId, type: 'VENDOR' }).session(session);
      if (!wallet) throw new Error('Wallet not found');
      if (wallet.status !== 'ACTIVE') throw new Error(`Wallet is ${wallet.status}. Cannot process payout.`);
      if (wallet.withdrawableBalance < params.amount) {
        throw new Error(
          `Insufficient withdrawable balance. Available: ₹${wallet.withdrawableBalance}, Requested: ₹${params.amount}`
        );
      }

      const debitEntry = new LedgerEntry({
        transactionId,
        accountId: wallet._id,
        shopId: params.shopId,
        amount: -params.amount,  // negative = debit
        type: 'PAYOUT',
        status: 'PENDING',       // pending bank processing
        description: `Payout request #${params.payoutId}`,
        referenceId: params.payoutId,
        referenceType: 'PAYOUT',
      });
      await debitEntry.save({ session });

      // Deduct from withdrawable immediately to prevent double-spending
      const updated = await Wallet.findOneAndUpdate(
        { _id: wallet._id, version: wallet.version }, // optimistic lock
        {
          $inc: { withdrawableBalance: -params.amount, version: 1 },
          $set: { updatedAt: new Date() },
        },
        { session, new: true }
      );

      if (!updated) {
        throw new Error('Concurrent modification detected on wallet. Please retry.');
      }

      await session.commitTransaction();

      await AuditLog.create({
        action: 'PAYOUT_INITIATED',
        performedBy: params.adminId || 'SYSTEM',
        targetEntity: 'Payout',
        targetId: params.payoutId,
        shopId: new mongoose.Types.ObjectId(params.shopId),
        before: { withdrawableBalance: wallet.withdrawableBalance },
        after: { withdrawableBalance: wallet.withdrawableBalance - params.amount },
        reason: `Payout of ₹${params.amount} initiated`,
      });

      return debitEntry;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Called after bank confirms successful transfer.
   * Marks payout ledger entry as CLEARED.
   */
  static async completePayout(payoutId: string, adminId?: string, transactionRef?: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const entry = await LedgerEntry.findOne({
        referenceId: payoutId,
        type: 'PAYOUT',
      }).session(session);

      if (!entry) throw new Error(`No ledger entry found for payout ${payoutId}`);
      if (entry.status === 'CLEARED') {
        // Already completed — idempotent
        await session.abortTransaction();
        return;
      }

      await LedgerEntry.updateOne(
        { _id: entry._id },
        { $set: { status: 'CLEARED', metadata: { transactionRef } } },
        { session }
      );

      await session.commitTransaction();

      await AuditLog.create({
        action: 'PAYOUT_COMPLETED',
        performedBy: adminId || 'SYSTEM',
        targetEntity: 'Payout',
        targetId: payoutId,
        shopId: entry.shopId,
        metadata: { transactionRef, amount: Math.abs(entry.amount) },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Called when admin rejects OR when bank transfer fails.
   * Reverses the payout ledger debit, restores withdrawable balance.
   * Creates a REVERSAL ledger entry (never mutates existing entry).
   */
  static async rejectPayout(payoutId: string, shopId: string, amount: number, reason?: string, adminId?: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const reversalKey = generateIdempotencyKey('PAYOUT_REVERSAL', payoutId);

      // Check if already reversed (idempotency)
      const alreadyReversed = await LedgerEntry.findOne({
        transactionId: reversalKey,
      }).session(session);
      if (alreadyReversed) {
        await session.abortTransaction();
        return;
      }

      const wallet = await Wallet.findOne({ shopId, type: 'VENDOR' }).session(session);
      if (!wallet) throw new Error('Wallet not found for reversal');

      // Create reversal entry (positive — restoring the debit)
      const reversalEntry = new LedgerEntry({
        transactionId: reversalKey,
        accountId: wallet._id,
        shopId,
        amount: amount, // positive = credit back
        type: 'ADJUSTMENT',
        status: 'CLEARED',
        description: `Payout reversal for request #${payoutId}. Reason: ${reason || 'Rejected'}`,
        referenceId: payoutId,
        referenceType: 'PAYOUT',
      });
      await reversalEntry.save({ session });

      // Restore withdrawable balance
      await Wallet.findOneAndUpdate(
        { _id: wallet._id, version: wallet.version },
        {
          $inc: { withdrawableBalance: amount, version: 1 },
          $set: { updatedAt: new Date() },
        },
        { session }
      );

      await session.commitTransaction();

      await AuditLog.create({
        action: 'PAYOUT_REJECTED',
        performedBy: adminId || 'SYSTEM',
        targetEntity: 'Payout',
        targetId: payoutId,
        shopId: new mongoose.Types.ObjectId(shopId),
        reason: reason || 'Rejected by admin',
        metadata: { amount, restoredTo: wallet.withdrawableBalance + amount },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Processes a refund — can handle negative balance (post-payout refund).
   */
  static async recordRefund(params: {
    orderId: string;
    refundId: string;
    items: Array<{ shopId: string; refundAmount: number; commissionReversal: number }>;
    performedBy?: string;
  }) {
    const transactionId = generateIdempotencyKey('REFUND', params.refundId);

    const existing = await LedgerEntry.findOne({ transactionId, type: 'REFUND' });
    if (existing) return;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const item of params.items) {
        const wallet = await Wallet.findOne({ shopId: item.shopId, type: 'VENDOR' }).session(session);
        if (!wallet) continue;

        // Deduct from vendor (may go negative — that's expected for post-payout refunds)
        const refundEntry = new LedgerEntry({
          transactionId,
          accountId: wallet._id,
          shopId: item.shopId,
          amount: -item.refundAmount,
          type: 'REFUND',
          status: 'CLEARED',
          description: `Refund deduction for Order #${params.orderId} (Refund #${params.refundId})`,
          referenceId: params.refundId,
          referenceType: 'REFUND',
        });
        await refundEntry.save({ session });

        // Deduct from withdrawable first, then pending
        const deductFromWithdrawable = Math.min(item.refundAmount, wallet.withdrawableBalance);
        const deductFromPending = item.refundAmount - deductFromWithdrawable;

        await Wallet.findOneAndUpdate(
          { _id: wallet._id, version: wallet.version },
          {
            $inc: {
              withdrawableBalance: -deductFromWithdrawable,
              pendingBalance: -deductFromPending,
              version: 1,
            },
            $set: { updatedAt: new Date() },
          },
          { session }
        );

        // Freeze wallet if balance goes negative
        const newWithdrawable = wallet.withdrawableBalance - deductFromWithdrawable;
        if (newWithdrawable < 0) {
          await Wallet.findByIdAndUpdate(
            wallet._id,
            { status: 'FROZEN' },
            { session }
          );
          await AuditLog.create({
            action: 'WALLET_AUTO_FROZEN_NEGATIVE_BALANCE',
            performedBy: 'SYSTEM',
            targetEntity: 'Wallet',
            targetId: wallet._id.toString(),
            shopId: wallet.shopId,
            reason: `Post-payout refund caused negative balance. Amount: ₹${item.refundAmount}`,
          });
        }

        // Also reverse platform commission
        const platformWallet = await Wallet.findOne({ type: 'PLATFORM_REVENUE' }).session(session);
        if (platformWallet && item.commissionReversal > 0) {
          const commEntry = new LedgerEntry({
            transactionId: generateIdempotencyKey('COMMISSION_REVERSAL', params.refundId),
            accountId: platformWallet._id,
            amount: -item.commissionReversal,
            type: 'COMMISSION',
            status: 'CLEARED',
            description: `Commission reversal for Refund #${params.refundId}`,
            referenceId: params.refundId,
            referenceType: 'REFUND',
          });
          await commEntry.save({ session });
          await Wallet.updateOne(
            { _id: platformWallet._id },
            { $inc: { withdrawableBalance: -item.commissionReversal, version: 1 } },
            { session }
          );
        }
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Freezes a vendor wallet (e.g., for disputes, AML flags).
   * Creates audit log.
   */
  static async freezeWallet(shopId: string, reason: string, adminId: string) {
    const wallet = await Wallet.findOne({ shopId, type: 'VENDOR' });
    if (!wallet) throw new Error('Wallet not found');

    const before = { status: wallet.status };
    await Wallet.findByIdAndUpdate(wallet._id, { status: 'FROZEN' });

    await AuditLog.create({
      action: 'WALLET_FROZEN',
      performedBy: adminId,
      targetEntity: 'Wallet',
      targetId: wallet._id.toString(),
      shopId: wallet.shopId,
      before,
      after: { status: 'FROZEN' },
      reason,
    });
  }

  /**
   * Unfreezes a vendor wallet.
   */
  static async unfreezeWallet(shopId: string, reason: string, adminId: string) {
    const wallet = await Wallet.findOne({ shopId, type: 'VENDOR' });
    if (!wallet) throw new Error('Wallet not found');

    const before = { status: wallet.status };
    await Wallet.findByIdAndUpdate(wallet._id, { status: 'ACTIVE' });

    await AuditLog.create({
      action: 'WALLET_UNFROZEN',
      performedBy: adminId,
      targetEntity: 'Wallet',
      targetId: wallet._id.toString(),
      shopId: wallet.shopId,
      before,
      after: { status: 'ACTIVE' },
      reason,
    });
  }

  /**
   * Cron job: moves PENDING ledger entries whose clearAt date has passed
   * into CLEARED state, transferring pendingBalance → withdrawableBalance.
   */
  static async clearPendingFunds() {
    const now = new Date();

    const entries = await LedgerEntry.find({
      status: 'PENDING',
      type: 'SALE',
      clearAt: { $lte: now },
    }).limit(500); // process in batches

    let cleared = 0;
    let failed = 0;

    for (const entry of entries) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await LedgerEntry.updateOne(
          { _id: entry._id },
          { $set: { status: 'CLEARED' } },
          { session }
        );

        await Wallet.findOneAndUpdate(
          { _id: entry.accountId },
          {
            $inc: {
              pendingBalance: -entry.amount,
              withdrawableBalance: entry.amount,
            },
            $set: { updatedAt: new Date() },
          },
          { session }
        );

        await session.commitTransaction();
        cleared++;
      } catch (error) {
        await session.abortTransaction();
        console.error(`[LedgerService] Failed to clear entry ${entry._id}:`, error);
        failed++;
      } finally {
        session.endSession();
      }
    }

    console.log(`[LedgerService.clearPendingFunds] Cleared: ${cleared}, Failed: ${failed}`);
    return { cleared, failed };
  }

  /**
   * Computes a vendor's balance directly from ledger entries (source of truth).
   * Used for reconciliation.
   */
  static async computeBalanceFromLedger(shopId: string) {
    const wallet = await Wallet.findOne({ shopId, type: 'VENDOR' });
    if (!wallet) return null;

    const result = await LedgerEntry.aggregate([
      { $match: { accountId: wallet._id, status: { $ne: 'VOIDED' } } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const balances: Record<string, number> = { PENDING: 0, CLEARED: 0 };
    result.forEach((r) => {
      balances[r._id] = r.total;
    });

    return {
      ledgerPendingBalance: balances['PENDING'] || 0,
      ledgerWithdrawableBalance: balances['CLEARED'] || 0,
      cachedPendingBalance: wallet.pendingBalance,
      cachedWithdrawableBalance: wallet.withdrawableBalance,
      isDrifted:
        Math.abs(balances['PENDING'] - wallet.pendingBalance) > 0.001 ||
        Math.abs(balances['CLEARED'] - wallet.withdrawableBalance) > 0.001,
    };
  }
}
