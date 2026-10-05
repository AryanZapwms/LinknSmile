// lib/services/push-notification.ts
//
// Expo push notifications to the mobile app, via Expo's HTTP push API
// (https://docs.expo.dev/push-notifications/sending-notifications/), with
// plain fetch — no SDK dependency.
//
// OFF unless PUSH_NOTIFICATIONS_ENABLED=true (set it once FCM/APNs
// credentials are configured in EAS). While off, every function returns
// immediately, exactly like the old no-op stub.
// Optional EXPO_ACCESS_TOKEN: required only if "enhanced push security" is
// turned on for the Expo project.
//
// Callers await these from payment, ledger and order flows, so they never
// throw and give up after PUSH_TIMEOUT_MS. Tokens Expo reports as
// DeviceNotRegistered are removed from User.pushTokens.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import Shop from "@/lib/models/shop";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo's per-request limit
const PUSH_TIMEOUT_MS = 5000;

export const isExpoPushToken = (t: unknown): t is string =>
  typeof t === "string" && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(t);

export function pushEnabled(): boolean {
  return process.env.PUSH_NOTIFICATIONS_ENABLED === "true";
}

type Id = string | mongoose.Types.ObjectId;

interface ExpoTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

/** Sends one notification to every registered device of these users. */
export async function sendPushToUsers(
  userIds: Id[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!pushEnabled() || userIds.length === 0) return;
  try {
    await connectDB();
    const users = await User.find({ _id: { $in: userIds } })
      .select("pushTokens")
      .lean<{ pushTokens?: string[] }[]>();
    const tokens = [...new Set(users.flatMap((u) => u.pushTokens ?? []))].filter(isExpoPushToken);
    if (tokens.length === 0) return;

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

    const dead: string[] = [];
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(batch.map((to) => ({ to, title, body, data, sound: "default" }))),
        signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
      });
      if (!res.ok) {
        console.error("[push] Expo push request failed", { status: res.status });
        continue;
      }
      const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
      json?.data?.forEach((ticket, idx) => {
        if (ticket.status === "error") {
          if (ticket.details?.error === "DeviceNotRegistered") dead.push(batch[idx]);
          else console.error("[push] ticket error", { error: ticket.details?.error, message: ticket.message });
        }
      });
    }
    if (dead.length) {
      await User.updateMany({ pushTokens: { $in: dead } }, { $pull: { pushTokens: { $in: dead } } });
    }
  } catch (err) {
    console.error("[push] send failed", err);
  }
}

async function ownerIdsForShops(shopIds: Id[]): Promise<Id[]> {
  await connectDB();
  const shops = await Shop.find({ _id: { $in: shopIds } })
    .select("ownerId")
    .lean<{ ownerId?: mongoose.Types.ObjectId }[]>();
  return shops.map((s) => s.ownerId).filter((id): id is mongoose.Types.ObjectId => !!id);
}

export async function sendPushNotificationToVendor(
  shopId: Id,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await sendPushNotificationToMultipleVendors([shopId], title, body, data);
}

export async function sendPushNotificationToMultipleVendors(
  shopIds: Id[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!pushEnabled() || shopIds.length === 0) return;
  try {
    await sendPushToUsers(await ownerIdsForShops(shopIds), title, body, data);
  } catch (err) {
    console.error("[push] vendor lookup failed", err);
  }
}
