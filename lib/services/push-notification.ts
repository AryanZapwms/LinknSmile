// lib/services/push-notification.ts
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import mongoose from 'mongoose';
import { User } from '../models/user';
import Shop from '../models/shop';

let expo = new Expo();

export async function sendPushNotificationToVendor(
  shopId: string | mongoose.Types.ObjectId,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    // Find shop and its owner
    const shop = await Shop.findById(shopId).populate<{ ownerId: any }>('ownerId');
    if (!shop || !shop.ownerId) {
      console.error(`No owner found for shop ${shopId}`);
      return;
    }

    const owner = shop.ownerId as any;
    const pushTokens = owner.pushTokens || [];

    if (pushTokens.length === 0) return;

    const messages: ExpoPushMessage[] = pushTokens
      .filter((token: string) => Expo.isExpoPushToken(token))
      .map((token: string) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

// Optional: send to multiple vendors at once
export async function sendPushNotificationToMultipleVendors(
  shopIds: (string | mongoose.Types.ObjectId)[],
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const uniqueShopIds = [...new Set(shopIds.map(id => id.toString()))];
  const shops = await Shop.find({ _id: { $in: uniqueShopIds } }).populate('ownerId');
  const allTokens: string[] = [];

  for (const shop of shops) {
    const owner = (shop as any).ownerId;
    if (owner?.pushTokens) {
      allTokens.push(...owner.pushTokens);
    }
  }

  const uniqueTokens = [...new Set(allTokens)];
  const validTokens = uniqueTokens.filter(token => Expo.isExpoPushToken(token));
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}