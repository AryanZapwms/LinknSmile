// lib/storage/index.ts
//
// Single entry point for "which image storage provider is this deployment
// running" — selection is driven by IMAGE_PROVIDER (lib/env.ts),
// defaulting to "cloudinary" so existing deployments are unaffected.
// Mirrors lib/payments/index.ts exactly.

import { cloudinaryAdapter } from "./cloudinary";
import { bunnyAdapter } from "./bunny";
import type { ImageStorageAdapter } from "./types";

const adapters: Record<string, ImageStorageAdapter> = {
  cloudinary: cloudinaryAdapter,
  bunny: bunnyAdapter,
};

export function getImageProvider(): ImageStorageAdapter {
  const provider = process.env.IMAGE_PROVIDER || "cloudinary";
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(
      `Unknown IMAGE_PROVIDER "${provider}". Supported: ${Object.keys(adapters).join(", ")}`
    );
  }
  return adapter;
}

export * from "./types";
