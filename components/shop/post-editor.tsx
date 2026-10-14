// components/shop/post-editor.tsx
//
// The form for one shop post, in a dialog on the vendor's Posts page
// (app/vendor/posts): title, text, an optional YouTube/Vimeo link and up to
// ten pictures.
//
// Saving happens in steps, because pictures go up one request each
// (app/api/vendor/posts/[id]/images): the text is saved first (a new post is
// created as a draft), then each new picture is uploaded, then the post is
// published if that was asked for. If a picture fails the post is still
// saved; the dialog stays open on that post so the picture can be tried
// again. Every check here is repeated by the server (lib/shop-posts.ts) with
// the same rules (lib/shop-post-rules.ts).
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IMAGE_SIGNATURE_BYTES, STOREFRONT_IMAGE_ACCEPT } from "@/lib/shop-storefront-rules";
import {
  POSTS_PER_SHOP_MAX,
  POST_IMAGE_MAX_BYTES,
  POST_MAX_IMAGES,
  POST_TEXT_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  checkPostImage,
  safeVideoUrl,
  type PostErrorReason,
} from "@/lib/shop-post-rules";
import type { ShopPostView } from "@/lib/shop-posts";

interface PostEditorProps {
  /** The post being edited, or null for a new one. */
  post: ShopPostView | null;
  open: boolean;
  onClose: () => void;
  /** Called after every change the server accepted, including a partly saved post. */
  onSaved: (post: ShopPostView) => void;
}

interface NewPicture {
  file: File;
  previewUrl: string;
}
type Field = "title" | "text" | "videoUrl" | "pictures" | "form";

const MAX_MB = POST_IMAGE_MAX_BYTES / (1024 * 1024);

/** A request the server refused, with its reason when it gave one. */
class RequestRefused extends Error {
  constructor(public reason?: PostErrorReason) {
    super("Request refused");
  }
}

export function PostEditor({ post, open, onClose, onSaved }: PostEditorProps) {
  const t = useTranslations("VendorPostsPage");
  const fileInput = useRef<HTMLInputElement>(null);

  // The post on the server. Starts as the prop and is replaced after every
  // accepted request, so a new post that was created but not finished is
  // edited, not created again, on the next Save.
  const [current, setCurrent] = useState<ShopPostView | null>(post);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [keptImages, setKeptImages] = useState<string[]>([]);
  const [newPictures, setNewPictures] = useState<NewPicture[]>([]);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [progress, setProgress] = useState<string | null>(null);
  const saving = progress !== null;

  // Start from the post each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setCurrent(post);
    setTitle(post?.title ?? "");
    setText(post?.text ?? "");
    setVideoUrl(post?.videoUrl ?? "");
    setKeptImages(post?.images ?? []);
    setNewPictures([]);
    setErrors({});
    setProgress(null);
  }, [open, post]);

  // Local previews are object URLs; release them when they are no longer shown.
  const previews = useRef<string[]>([]);
  useEffect(() => {
    const shown = newPictures.map((p) => p.previewUrl);
    previews.current.filter((url) => !shown.includes(url)).forEach((url) => URL.revokeObjectURL(url));
    previews.current = shown;
  }, [newPictures]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const pictureCount = keptImages.length + newPictures.length;

  const errorText = (reason: PostErrorReason | undefined, name = "") => {
    switch (reason) {
      case "TITLE_REQUIRED":
        return t("errorTitleRequired");
      case "TITLE_TOO_LONG":
        return t("errorTitleTooLong", { max: POST_TITLE_MAX_LENGTH });
      case "TEXT_TOO_LONG":
        return t("errorTextTooLong", { max: POST_TEXT_MAX_LENGTH });
      case "VIDEO_URL":
        return t("errorVideoUrl");
      case "IMAGE_TYPE":
        return t("errorImageType", { name });
      case "IMAGE_TOO_LARGE":
        return t("errorImageTooLarge", { name, maxMb: MAX_MB });
      case "TOO_MANY_IMAGES":
        return t("errorTooManyImages", { max: POST_MAX_IMAGES });
      case "TOO_MANY_POSTS":
        return t("limitReached", { max: POSTS_PER_SHOP_MAX });
      case "POST_REMOVED":
        return t("errorPostRemoved");
      default:
        return t("errorGeneric");
    }
  };

  const fieldOf = (reason: PostErrorReason | undefined): Field => {
    if (reason === "TITLE_REQUIRED" || reason === "TITLE_TOO_LONG") return "title";
    if (reason === "TEXT_TOO_LONG") return "text";
    if (reason === "VIDEO_URL") return "videoUrl";
    if (reason === "IMAGE_TYPE" || reason === "IMAGE_TOO_LARGE" || reason === "TOO_MANY_IMAGES") {
      return "pictures";
    }
    return "form";
  };

  const handleFilesChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // so the same file can be chosen again
    const accepted: NewPicture[] = [];
    const problems: string[] = [];
    let room = POST_MAX_IMAGES - pictureCount;

    for (const file of files) {
      if (room <= 0) {
        problems.push(errorText("TOO_MANY_IMAGES"));
        break;
      }
      const head = new Uint8Array(await file.slice(0, IMAGE_SIGNATURE_BYTES).arrayBuffer());
      const reason = checkPostImage(file.size, head);
      if (reason) {
        problems.push(errorText(reason, file.name));
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
      room--;
    }

    if (accepted.length > 0) setNewPictures((prev) => [...prev, ...accepted]);
    setErrors((prev) => ({ ...prev, pictures: problems.length ? problems.join(" ") : undefined }));
  };

  /** One request; returns the saved post or throws the server's reason. */
  const send = async (url: string, init: RequestInit): Promise<ShopPostView> => {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.post) throw new RequestRefused(json?.reason);
    setCurrent(json.post);
    onSaved(json.post);
    return json.post;
  };
  const sendJson = (url: string, method: "POST" | "PUT", body: unknown) =>
    send(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const handleSave = async (publish: boolean) => {
    const cleanTitle = title.trim();
    const cleanVideo = videoUrl.trim();
    const found: Partial<Record<Field, string>> = {};
    if (!cleanTitle) found.title = errorText("TITLE_REQUIRED");
    else if (cleanTitle.length > POST_TITLE_MAX_LENGTH) found.title = errorText("TITLE_TOO_LONG");
    if (text.trim().length > POST_TEXT_MAX_LENGTH) found.text = errorText("TEXT_TOO_LONG");
    if (cleanVideo && !safeVideoUrl(cleanVideo)) found.videoUrl = errorText("VIDEO_URL");
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setProgress(t("saving"));
    try {
      // 1. The text. A new post is created as a draft; pictures need its id.
      const fields = { title: cleanTitle, text, videoUrl: cleanVideo };
      let saved = current
        ? await sendJson(`/api/vendor/posts/${current._id}`, "PUT", { ...fields, images: keptImages })
        : await sendJson("/api/vendor/posts", "POST", fields);
      setKeptImages(saved.images);

      // 2. New pictures, one request each. One that fails stays in the form.
      const queue = [...newPictures];
      let failed = false;
      for (let i = 0; i < queue.length; i++) {
        setProgress(t("uploadingPicture", { current: i + 1, total: queue.length }));
        const body = new FormData();
        body.append("image", queue[i].file);
        try {
          saved = await send(`/api/vendor/posts/${saved._id}/images`, { method: "POST", body });
          setKeptImages(saved.images);
          setNewPictures((prev) => prev.filter((p) => p !== queue[i]));
        } catch (error: any) {
          failed = true;
          setErrors({
            pictures:
              error?.reason === "IMAGE_TYPE" || error?.reason === "IMAGE_TOO_LARGE"
                ? errorText(error.reason, queue[i].file.name)
                : error?.reason === "TOO_MANY_IMAGES"
                  ? errorText("TOO_MANY_IMAGES")
                  : t("picturesNotUploaded"),
          });
          break;
        }
      }
      if (failed) return; // saved so far; the dialog stays open on this post

      // 3. Publish, if asked and not already.
      if (publish && saved.status !== "published") {
        saved = await sendJson(`/api/vendor/posts/${saved._id}`, "PUT", { status: "published" });
      }

      toast.success(publish && post?.status !== "published" ? t("publishedToast") : t("savedToast"));
      onClose();
    } catch (error: any) {
      const reason = error?.reason as PostErrorReason | undefined;
      setErrors({ [fieldOf(reason)]: errorText(reason) });
    } finally {
      setProgress(null);
    }
  };

  const isPublished = current?.status === "published";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{post ? t("editorEditTitle") : t("editorNewTitle")}</DialogTitle>
          <DialogDescription>{t("editorDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-title">{t("titleLabel")}</Label>
              <span className="text-muted-foreground text-xs">
                {title.trim().length}/{POST_TITLE_MAX_LENGTH}
              </span>
            </div>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              disabled={saving}
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-text">{t("textLabel")}</Label>
              <span className="text-muted-foreground text-xs">
                {text.trim().length}/{POST_TEXT_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="post-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("textPlaceholder")}
              className="min-h-[140px]"
              disabled={saving}
              aria-invalid={!!errors.text}
            />
            {errors.text && <p className="text-sm text-red-600">{errors.text}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-video">{t("videoLabel")}</Label>
            <Input
              id="post-video"
              type="url"
              dir="ltr"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              disabled={saving}
              aria-invalid={!!errors.videoUrl}
            />
            <p className="text-muted-foreground text-xs">{t("videoHint")}</p>
            {errors.videoUrl && <p className="text-sm text-red-600">{errors.videoUrl}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("picturesLabel")}</Label>
              <span className="text-muted-foreground text-xs">
                {pictureCount}/{POST_MAX_IMAGES}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("picturesHint", { max: POST_MAX_IMAGES, maxMb: MAX_MB })}
            </p>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {keptImages.map((src) => (
                <div key={src} className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                  <Image src={src} alt="" fill sizes="140px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setKeptImages((prev) => prev.filter((url) => url !== src))}
                    disabled={saving}
                    aria-label={t("removePicture")}
                    className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newPictures.map((picture) => (
                <div
                  key={picture.previewUrl}
                  className="bg-muted relative aspect-square overflow-hidden rounded-lg ring-2 ring-amber-300"
                >
                  {/* Plain <img>: a local preview of a file not uploaded yet. */}
                  <img src={picture.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewPictures((prev) => prev.filter((p) => p !== picture))}
                    disabled={saving}
                    aria-label={t("removePicture")}
                    className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {pictureCount < POST_MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={saving}
                  className="text-muted-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs disabled:opacity-50"
                >
                  <ImagePlus className="h-5 w-5" />
                  {t("addPictures")}
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={STOREFRONT_IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={handleFilesChosen}
            />
            {errors.pictures && <p className="text-sm text-red-600">{errors.pictures}</p>}
          </div>

          {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
        </div>

        <DialogFooter className="items-center gap-2">
          {saving && (
            <span className="text-muted-foreground me-auto flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> {progress}
            </span>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          {isPublished ? (
            <Button onClick={() => handleSave(false)} disabled={saving}>
              {t("saveChanges")}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                {t("saveDraft")}
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                {t("publish")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
