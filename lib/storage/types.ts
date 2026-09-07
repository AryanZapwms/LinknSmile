// lib/storage/types.ts
//
// Provider-agnostic image storage interface. Both lib/storage/cloudinary.ts
// and lib/storage/bunny.ts implement this — see lib/storage/index.ts for
// how the active one is selected (driven by IMAGE_PROVIDER, lib/env.ts).
// Mirrors lib/payments/types.ts's shape for the same reason: callers
// (app/api/upload/route.ts) never need to know which provider is active.
//
// Scope is deliberately upload-only, matching what the app actually does
// today — there is no deleteImage() anywhere because lib/cloudinary.ts
// never had one either (uploaded Cloudinary assets are never
// programmatically deleted by this app).

export interface UploadImageParams {
  buffer: Buffer;
  /** Original filename, used only to derive an extension — the stored
   *  filename is always randomized to avoid collisions. */
  filename: string;
  folder: string;
}

export interface UploadImageResult {
  url: string;
}

export interface ImageStorageAdapter {
  name: "cloudinary" | "bunny";
  uploadImage(params: UploadImageParams): Promise<UploadImageResult>;
}

export class ImageStorageError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}
