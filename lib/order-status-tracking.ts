// lib/order-status-tracking.ts
//
// Records who changed an order's status and when: Order.statusHistory,
// deliveredAt, cancelledAt and cancelledBy (see lib/models/order.ts).
//
// Used by the only two routes that change a status after an order exists:
//   - admin  PUT   /api/orders/:id         merges statusChangeUpdate() into
//                                           its own (single, atomic) update;
//   - vendor PATCH /api/vendor/orders/:id  saves the order as it always has,
//                                           then calls recordStatusChange().
//
// Nothing here touches vendorPayouts, the wallet or the ledger.

import { Order } from "@/lib/models/order";

export interface StatusActor {
  userId: string;
  /** The actor's role at the time: "admin", "shop_owner" or "user". */
  role: string;
}

export interface StatusChangeUpdate {
  $push: { statusHistory: { status: string; at: Date; by: StatusActor } };
  $set?: { deliveredAt?: Date; cancelledAt?: Date; cancelledBy?: StatusActor };
}

/**
 * The fields to write when an order's status goes from `previous` to `next`.
 * Returns null when the status is not actually changing, so re-sending the
 * current status never adds a history entry or moves a timestamp.
 */
export function statusChangeUpdate(
  previous: string | null | undefined,
  next: string,
  actor: StatusActor,
  at: Date = new Date()
): StatusChangeUpdate | null {
  if (!next || previous === next) return null;

  const by: StatusActor = { userId: actor.userId, role: actor.role };
  const update: StatusChangeUpdate = { $push: { statusHistory: { status: next, at, by } } };
  if (next === "delivered") update.$set = { deliveredAt: at };
  if (next === "cancelled") update.$set = { cancelledAt: at, cancelledBy: by };
  return update;
}

/**
 * For a route that has ALREADY saved the new status: writes the tracking
 * fields in one atomic update. Never throws. The status change has happened
 * by now and must not be reported as failed because its history entry could
 * not be written; the failure is logged instead.
 */
export async function recordStatusChange(
  orderId: unknown,
  previous: string | null | undefined,
  next: string,
  actor: StatusActor
): Promise<void> {
  const update = statusChangeUpdate(previous, next, actor);
  if (!update) return;
  try {
    // timestamps: false: updatedAt was set by the save that changed the status.
    await Order.updateOne({ _id: orderId }, update, { timestamps: false });
  } catch (error) {
    console.error("[order-status-tracking] could not record the status change", { orderId: String(orderId), next, error });
  }
}
