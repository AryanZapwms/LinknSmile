// app/api/upload/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getImageProvider, ImageStorageError } from "@/lib/storage";

export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCORS(new NextResponse(null));
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "shop_owner")) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const folder = (formData.get("folder") as string) || "link-and-smile";

    if (!files || files.length === 0) {
      return withCORS(NextResponse.json({ error: "No files provided" }, { status: 400 }));
    }

    const provider = getImageProvider();
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!file) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await provider.uploadImage({ buffer, filename: file.name, folder });
      uploadedUrls.push(result.url);
    }

    return withCORS(
      NextResponse.json({
        success: true,
        urls: uploadedUrls,
      })
    );
  } catch (error) {
    console.error("Error uploading files:", error);
    const status = error instanceof ImageStorageError ? error.status : 500;
    return withCORS(NextResponse.json({ error: "Failed to upload files" }, { status }));
  }
}
