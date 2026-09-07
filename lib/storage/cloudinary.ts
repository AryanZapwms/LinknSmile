// lib/storage/cloudinary.ts
//
// Wrapper extraction of the Cloudinary upload logic that used to live
// inline in app/api/upload/route.ts — NOT a rewrite. Behavior is
// deliberately identical to before this file existed.

import cloudinary from "@/lib/cloudinary";
import type { ImageStorageAdapter, UploadImageParams, UploadImageResult } from "./types";

async function uploadImage(params: UploadImageParams): Promise<UploadImageResult> {
  const { buffer, folder } = params;

  const result = (await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error: any, result: any) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  })) as any;

  return { url: result.secure_url };
}

export const cloudinaryAdapter: ImageStorageAdapter = {
  name: "cloudinary",
  uploadImage,
};
