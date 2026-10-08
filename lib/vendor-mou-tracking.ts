// lib/vendor-mou-tracking.ts
//
// Admin-side view of MOU acceptance (app/api/admin/vendors/mou*): which
// vendors have accepted CURRENT_MOU_VERSION (lib/mou-content.ts), and the
// reminder emails sent to those who haven't.
//
// "Vendor" here means an active shop whose owner account is still usable.
// Shops that were closed (vendor exit), rejected or deactivated, and shops
// whose owner is deleted or deactivated, are left out entirely: they are
// neither counted as pending nor emailed.
//
// Reminders have no collection of their own. Each email that actually goes
// out writes one AuditLog row (MOU_REMINDER_ACTION, metadata.mouVersion);
// "last reminded", the reminder count and the cooldown are all read back
// from those rows. They are per MOU version, so bumping the version starts
// every vendor from zero again.

import mongoose, { type PipelineStage } from "mongoose";
import { connectDB } from "@/lib/db";
import Shop from "@/lib/models/shop";
import { User } from "@/lib/models/user";
import { VendorMouAcceptance } from "@/lib/models/vendor-mou-acceptance";
import { AuditLog } from "@/lib/models/audit-log";
import { CURRENT_MOU_VERSION } from "@/lib/mou-content";
import { sendEmail, getVendorMouReminderEmail } from "@/lib/email";
import { resolveEmailLocale } from "@/lib/email-locale";

export const MOU_REMINDER_ACTION = "VENDOR_MOU_REMINDER_SENT";

/** A vendor is reminded at most once per MOU version in this window. */
export const MOU_REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Every email is its own Gmail SMTP login (lib/email.tsx), so sends go out
// one at a time with a pause in between.
const SEND_DELAY_MS = 1000;
// A run stops starting new sends after this long so the request answers
// well inside the proxy's 60s read timeout; the rest is reported as
// `remaining` and goes out with the next run.
const RUN_BUDGET_MS = 40_000;
// This many failed sends in a row means the mail setup is failing, not one
// address — stop instead of retrying against it.
const MAX_CONSECUTIVE_FAILURES = 3;

export interface VendorMouDoc {
  _id: mongoose.Types.ObjectId;
  shopName: string;
  isApproved: boolean;
  createdAt: Date;
  owner: { _id: mongoose.Types.ObjectId; name?: string; email?: string; locale?: string };
  accepted: boolean;
  acceptedAt: Date | null;
}

/**
 * Shop → owner (User) → acceptance of the current MOU version, for
 * Shop.aggregate(). Every resulting document is a VendorMouDoc.
 */
export function vendorMouStages(): PipelineStage[] {
  return [
    { $match: { isActive: true } },
    {
      $lookup: {
        from: User.collection.name,
        localField: "ownerId",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },
    { $match: { "owner.isActive": { $ne: false }, "owner.deletedAt": null } },
    {
      $lookup: {
        from: VendorMouAcceptance.collection.name,
        let: { ownerId: "$ownerId" },
        pipeline: [
          { $match: { mouVersion: CURRENT_MOU_VERSION, $expr: { $eq: ["$userId", "$$ownerId"] } } },
          { $project: { _id: 0, acceptedAt: 1 } },
        ],
        as: "acceptance",
      },
    },
    {
      $project: {
        shopName: 1,
        isApproved: 1,
        createdAt: 1,
        owner: {
          _id: "$owner._id",
          name: "$owner.name",
          email: "$owner.email",
          locale: "$owner.locale",
        },
        accepted: { $gt: [{ $size: "$acceptance" }, 0] },
        acceptedAt: { $ifNull: [{ $arrayElemAt: ["$acceptance.acceptedAt", 0] }, null] },
      },
    },
  ];
}

export interface MouReminderStats {
  count: number;
  lastRemindedAt: Date;
}

/** Reminders sent for the current MOU version, keyed by shop id. */
export async function getMouReminderStats(
  shopIds: mongoose.Types.ObjectId[]
): Promise<Map<string, MouReminderStats>> {
  const stats = new Map<string, MouReminderStats>();
  if (shopIds.length === 0) return stats;

  const rows = await AuditLog.aggregate<MouReminderStats & { _id: mongoose.Types.ObjectId }>([
    {
      $match: {
        action: MOU_REMINDER_ACTION,
        shopId: { $in: shopIds },
        "metadata.mouVersion": CURRENT_MOU_VERSION,
      },
    },
    { $group: { _id: "$shopId", count: { $sum: 1 }, lastRemindedAt: { $max: "$createdAt" } } },
  ]);
  for (const row of rows) {
    stats.set(String(row._id), { count: row.count, lastRemindedAt: row.lastRemindedAt });
  }
  return stats;
}

/** When the cooldown ends, or null if a reminder may go out now. */
export function nextMouReminderAt(
  lastRemindedAt: Date | undefined,
  now: number = Date.now()
): Date | null {
  if (!lastRemindedAt) return null;
  const next = lastRemindedAt.getTime() + MOU_REMINDER_COOLDOWN_MS;
  return next > now ? new Date(next) : null;
}

export type MouReminderTarget = { all: true } | { shopIds: string[] };

export type MouReminderSkipReason = "already_accepted" | "cooldown" | "no_email" | "not_found";

export interface MouReminderResult {
  shopId: string;
  shopName: string | null;
  email: string | null;
  status: "sent" | "failed" | "skipped";
  /** Set when status is "skipped". */
  reason?: MouReminderSkipReason;
}

export interface MouReminderRun {
  results: MouReminderResult[];
  /** `remaining`: vendors who still need a reminder but were not tried in this run. */
  summary: { sent: number; failed: number; skipped: number; remaining: number };
  /** Why the run ended before every vendor was tried, if it did. */
  stopped: "time_budget" | "send_failures" | null;
}

export interface MouReminderOptions {
  /** Admin user id, recorded on each AuditLog row. */
  performedBy: string;
  sendDelayMs?: number;
  runBudgetMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function reasonToSkipNow(vendor: VendorMouDoc): Promise<MouReminderSkipReason | null> {
  const [accepted, reminded] = await Promise.all([
    VendorMouAcceptance.exists({ userId: vendor.owner._id, mouVersion: CURRENT_MOU_VERSION }),
    AuditLog.exists({
      action: MOU_REMINDER_ACTION,
      shopId: vendor._id,
      "metadata.mouVersion": CURRENT_MOU_VERSION,
      createdAt: { $gt: new Date(Date.now() - MOU_REMINDER_COOLDOWN_MS) },
    }),
  ]);
  if (accepted) return "already_accepted";
  return reminded ? "cooldown" : null;
}

/** Sends one reminder. The AuditLog row is written only once the email has gone out. */
async function sendReminder(vendor: VendorMouDoc, performedBy: string): Promise<boolean> {
  try {
    const sent = await sendEmail({
      to: vendor.owner.email!,
      subject: `Action Required: Accept the Vendor MOU - ${vendor.shopName}`,
      html: await getVendorMouReminderEmail({
        vendorName: vendor.owner.name || "Vendor",
        shopName: vendor.shopName,
        mouVersion: CURRENT_MOU_VERSION,
        locale: resolveEmailLocale(vendor.owner.locale),
      }),
    });
    if (!sent) return false;
  } catch (err) {
    console.error("[mou-reminder] email failed", { shopId: String(vendor._id), err });
    return false;
  }

  try {
    await AuditLog.create({
      action: MOU_REMINDER_ACTION,
      performedBy,
      targetEntity: "Shop",
      targetId: vendor._id,
      shopId: vendor._id,
      // No email address here: audit rows are immutable, and account
      // deletion (lib/account-deletion.ts) could never scrub it.
      metadata: { mouVersion: CURRENT_MOU_VERSION, userId: vendor.owner._id },
    });
  } catch (err) {
    // The email is out; without this row the cooldown and the counts miss it.
    console.error("[mou-reminder] AUDIT_LOG_WRITE_FAILED", { shopId: String(vendor._id), err });
  }
  return true;
}

/**
 * Emails the MOU reminder to the given shops, or to every pending vendor
 * ({ all: true }), one at a time. A vendor is only emailed if, at the moment
 * of sending, they still haven't accepted the current version and haven't
 * been reminded within the cooldown.
 */
export async function sendMouReminders(
  target: MouReminderTarget,
  options: MouReminderOptions
): Promise<MouReminderRun> {
  const { performedBy, sendDelayMs = SEND_DELAY_MS, runBudgetMs = RUN_BUDGET_MS } = options;
  await connectDB();

  const shopIds =
    "shopIds" in target
      ? [...new Set(target.shopIds)].map((id) => new mongoose.Types.ObjectId(id))
      : null;
  const pipeline: PipelineStage[] = [
    ...(shopIds ? [{ $match: { _id: { $in: shopIds } } }] : []),
    ...vendorMouStages(),
    ...(shopIds ? [] : [{ $match: { accepted: false } }]),
    { $sort: { createdAt: 1, _id: 1 } },
  ];
  const vendors = await Shop.aggregate<VendorMouDoc>(pipeline);
  const stats = await getMouReminderStats(vendors.map((v) => v._id));

  const results: MouReminderResult[] = [];
  const record = (
    vendor: VendorMouDoc,
    status: MouReminderResult["status"],
    reason?: MouReminderSkipReason
  ) =>
    results.push({
      shopId: String(vendor._id),
      shopName: vendor.shopName,
      email: vendor.owner.email ?? null,
      status,
      ...(reason ? { reason } : {}),
    });

  if (shopIds) {
    const found = new Set(vendors.map((v) => String(v._id)));
    for (const id of shopIds) {
      if (!found.has(String(id))) {
        results.push({
          shopId: String(id),
          shopName: null,
          email: null,
          status: "skipped",
          reason: "not_found",
        });
      }
    }
  }

  const queue: VendorMouDoc[] = [];
  const now = Date.now();
  for (const vendor of vendors) {
    if (vendor.accepted) record(vendor, "skipped", "already_accepted");
    else if (!vendor.owner.email) record(vendor, "skipped", "no_email");
    else if (nextMouReminderAt(stats.get(String(vendor._id))?.lastRemindedAt, now)) {
      record(vendor, "skipped", "cooldown");
    } else queue.push(vendor);
  }

  const startedAt = Date.now();
  let processed = 0;
  let attempts = 0;
  let failuresInARow = 0;
  let stopped: MouReminderRun["stopped"] = null;

  for (const vendor of queue) {
    if (attempts > 0) {
      if (Date.now() - startedAt >= runBudgetMs) {
        stopped = "time_budget";
        break;
      }
      await sleep(sendDelayMs);
    }

    // The queue was built at the start of the run, which may be tens of
    // seconds ago by now: check again, so a vendor who accepted meanwhile,
    // or was just reminded by another admin, isn't emailed.
    const skip = await reasonToSkipNow(vendor);
    processed++;
    if (skip) {
      record(vendor, "skipped", skip);
      continue;
    }

    attempts++;
    const sent = await sendReminder(vendor, performedBy);
    record(vendor, sent ? "sent" : "failed");
    if (sent) failuresInARow = 0;
    else if (++failuresInARow >= MAX_CONSECUTIVE_FAILURES) {
      stopped = "send_failures";
      break;
    }
  }

  const count = (status: MouReminderResult["status"]) =>
    results.filter((r) => r.status === status).length;
  return {
    results,
    summary: {
      sent: count("sent"),
      failed: count("failed"),
      skipped: count("skipped"),
      remaining: queue.length - processed,
    },
    stopped,
  };
}
