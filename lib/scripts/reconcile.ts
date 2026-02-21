import { connectDB } from "../db";
import { Wallet } from "../models/wallet";
import { LedgerEntry } from "../models/ledger";
import mongoose from "mongoose";

export async function reconcileAllWallets() {
  await connectDB();
  const wallets = await Wallet.find({});
  const reports = [];

  for (const wallet of wallets) {
    const aggregate = await LedgerEntry.aggregate([
      { $match: { accountId: wallet._id } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const pendingSum = aggregate.find(a => a._id === 'PENDING')?.total || 0;
    const clearedSum = aggregate.find(a => a._id === 'CLEARED')?.total || 0;

    const issues = [];
    if (wallet.pendingBalance !== pendingSum) {
      issues.push(`Pending mismatch: Cache=${wallet.pendingBalance}, Ledger=${pendingSum}`);
    }
    if (wallet.withdrawableBalance !== clearedSum) {
      issues.push(`Cleared mismatch: Cache=${wallet.withdrawableBalance}, Ledger=${clearedSum}`);
    }

    if (issues.length > 0) {
      reports.push({
        walletId: wallet._id,
        shopId: wallet.shopId,
        issues
      });
      
      // Auto-correct cache in reconciliation (optional but safer to log first)
      await Wallet.updateOne(
        { _id: wallet._id },
        { 
            $set: { 
                pendingBalance: pendingSum, 
                withdrawableBalance: clearedSum,
                lastReconciledAt: new Date()
            } 
        }
      );
    }
  }

  return reports;
}

// Check Platform Liability
export async function checkSystemIntegrity() {
    const totalLiabilities = await Wallet.aggregate([
        { $match: { type: 'VENDOR' } },
        { $group: { _id: null, total: { $sum: { $add: ["$pendingBalance", "$withdrawableBalance"] } } } }
    ]);

    const platformRevenue = await Wallet.findOne({ type: 'PLATFORM_REVENUE' });
    
    // In a real system, you'd fetch the actual Bank Account balance via API here
    // const bankBalance = await BankAPI.getBalance();
    
    return {
        vendorLiabilities: totalLiabilities[0]?.total || 0,
        platformRevenue: platformRevenue?.withdrawableBalance || 0,
        // integrity: bankBalance >= (vendorLiabilities + platformRevenue)
    };
}
