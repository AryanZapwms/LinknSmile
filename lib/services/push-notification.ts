// lib/services/push-notification.ts
//
// Expo push notifications are not active in the web app.
// Functions are stubbed so existing callers (e.g. admin/payouts route) don't break.
// When you build a mobile app, reinstall expo-server-sdk and restore the implementation.

import mongoose from "mongoose";

export async function sendPushNotificationToVendor(
  _shopId: string | mongoose.Types.ObjectId,
  _title: string,
  _body: string,
  _data?: Record<string, unknown>
): Promise<void> {
  // no-op — Expo SDK not installed in web build
}

export async function sendPushNotificationToMultipleVendors(
  _shopIds: (string | mongoose.Types.ObjectId)[],
  _title: string,
  _body: string,
  _data?: Record<string, unknown>
): Promise<void> {
  // no-op — Expo SDK not installed in web build
}