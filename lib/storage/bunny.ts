// lib/storage/bunny.ts
//
// Bunny.net Storage adapter — a plain REST PUT against Bunny's Storage
// API (https://docs.bunny.net/reference/storage-api), no SDK dependency
// needed. Unlike Cloudinary, Bunny requires the caller to name the
// object, so a collision-safe name is generated here (crypto.randomUUID()
// plus the original file's extension).

import { randomUUID } from "crypto";
import path from "path";
import type { ImageStorageAdapter, UploadImageParams, UploadImageResult } from "./types";
import { ImageStorageError } from "./types";

const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

function contentTypeForExtension(ext: string): string {
  return CONTENT_TYPES_BY_EXTENSION[ext.toLowerCase()] || "application/octet-stream";
}

async function uploadImage(params: UploadImageParams): Promise<UploadImageResult> {
  const { buffer, filename, folder } = params;

  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const apiKey = process.env.BUNNY_STORAGE_API_KEY;
  const endpoint = process.env.BUNNY_STORAGE_ENDPOINT || "storage.bunnycdn.com";
  const pullZoneHostname = process.env.BUNNY_PULL_ZONE_HOSTNAME;

  if (!storageZone || !apiKey || !pullZoneHostname) {
    throw new ImageStorageError(
      "Bunny storage is not configured (BUNNY_STORAGE_ZONE / BUNNY_STORAGE_API_KEY / BUNNY_PULL_ZONE_HOSTNAME)"
    );
  }

  const ext = path.extname(filename);
  const objectPath = `${folder}/${randomUUID()}${ext}`;

  const response = await fetch(`https://${endpoint}/${storageZone}/${objectPath}`, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": contentTypeForExtension(ext),
    },
    // TS's DOM BodyInit type doesn't structurally accept Node's Buffer
    // subclass directly — a plain Uint8Array view of the same bytes does.
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ImageStorageError(
      `Bunny upload failed (${response.status}): ${detail || response.statusText}`
    );
  }

  return { url: `https://${pullZoneHostname}/${objectPath}` };
}

export const bunnyAdapter: ImageStorageAdapter = {
  name: "bunny",
  uploadImage,
};
