"use client";

// The "Posts" tab of /admin/vendors/[id]: every post of one shop, from
// GET /api/admin/vendors/:id/posts, with two actions through
// PATCH /api/admin/vendors/:id/posts/:postId —
//   Unpublish: back to draft; the vendor may fix it and publish again.
//   Remove: taken down for good; the vendor can only delete it.
// Both ask for a reason, which the vendor sees on their Posts page, and both
// are written to the audit log by the server.

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { EyeOff, Loader2, Newspaper, PlayCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { LOCALE } from "@/lib/currency";
import { POST_MODERATION_REASON_MAX_LENGTH } from "@/lib/shop-post-rules";
import type { ShopPostView } from "@/lib/shop-posts";

type Action = "unpublish" | "remove";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });

export function PostsPanel({ shopId }: { shopId: string }) {
  const t = useTranslations("AdminVendorPosts");
  const { toast } = useToast();
  const [posts, setPosts] = useState<ShopPostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // The action being confirmed, with the reason typed so far.
  const [pending, setPending] = useState<{ post: ShopPostView; action: Action } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch(`/api/admin/vendors/${shopId}/posts`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("load failed");
      setPosts(data.posts ?? []);
    } catch (error) {
      console.error("Failed to load shop posts:", error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (post: ShopPostView, action: Action) => {
    setPending({ post, action });
    setReason("");
    setReasonError(null);
  };

  const confirm = async () => {
    if (!pending) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError(t("reasonRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/vendors/${shopId}/posts/${pending.post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pending.action, reason: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.post) {
        // The post may have changed since the list was loaded; show its state now.
        toast({
          title: t("actionFailedTitle"),
          description: data?.message || t("actionFailed"),
          variant: "destructive",
        });
        setPending(null);
        load();
        return;
      }
      setPosts((prev) => prev.map((p) => (p._id === data.post._id ? data.post : p)));
      toast({ title: pending.action === "remove" ? t("removedToast") : t("unpublishedToast") });
      setPending(null);
    } catch (error) {
      console.error("Failed to update shop post:", error);
      toast({ title: t("actionFailedTitle"), description: t("actionFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (post: ShopPostView) => {
    if (post.status === "published") {
      return <Badge className="bg-green-600 text-white">{t("statusPublished")}</Badge>;
    }
    if (post.status === "removed") return <Badge variant="destructive">{t("statusRemoved")}</Badge>;
    return <Badge variant="outline">{t("statusDraft")}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (loadFailed) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4 text-sm">{t("loadFailed")}</p>
          <Button variant="outline" onClick={load}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("intro")}</p>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Newspaper className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post._id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold break-words">{post.title}</h3>
                    {statusBadge(post)}
                    {post.hiddenBySubscription && (
                      <Badge variant="secondary">{t("hiddenBySubscription")}</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t("dates", {
                      created: formatDate(post.createdAt),
                      updated: formatDate(post.updatedAt),
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {post.status === "published" && (
                    <Button variant="outline" size="sm" onClick={() => open(post, "unpublish")}>
                      <EyeOff className="me-2 h-4 w-4" />
                      {t("unpublish")}
                    </Button>
                  )}
                  {post.status !== "removed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => open(post, "remove")}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {t("remove")}
                    </Button>
                  )}
                </div>
              </div>

              {post.text && (
                <p className="text-sm break-words whitespace-pre-line text-gray-700">{post.text}</p>
              )}

              {post.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.images.map((src) => (
                    <a
                      key={src}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-muted relative block h-20 w-20 overflow-hidden rounded-md"
                    >
                      <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {post.videoUrl && (
                <a
                  href={post.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm break-all text-blue-600 hover:underline"
                >
                  <PlayCircle className="h-4 w-4 shrink-0" /> {post.videoUrl}
                </a>
              )}

              {post.moderation && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-medium">
                    {t(post.moderation.action === "removed" ? "noteRemoved" : "noteUnpublished", {
                      date: formatDate(post.moderation.at),
                    })}
                  </p>
                  <p className="mt-0.5 break-words">
                    {t("noteReason", { reason: post.moderation.reason })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={pending !== null} onOpenChange={(next) => !next && !saving && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.action === "remove" ? t("removeTitle") : t("unpublishTitle")}
            </DialogTitle>
            <DialogDescription>
              {pending?.action === "remove" ? t("removeDescription") : t("unpublishDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium break-words">{pending?.post.title}</p>
            <div className="flex items-center justify-between">
              <Label htmlFor="moderation-reason">{t("reasonLabel")}</Label>
              <span className="text-muted-foreground text-xs">
                {reason.trim().length}/{POST_MODERATION_REASON_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="moderation-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(null);
              }}
              maxLength={POST_MODERATION_REASON_MAX_LENGTH}
              placeholder={t("reasonPlaceholder")}
              className="min-h-[100px]"
              disabled={saving}
            />
            <p className="text-muted-foreground text-xs">{t("reasonHint")}</p>
            {reasonError && <p className="text-sm text-red-600">{reasonError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button
              variant={pending?.action === "remove" ? "destructive" : "default"}
              onClick={confirm}
              disabled={saving}
            >
              {saving
                ? t("saving")
                : pending?.action === "remove"
                  ? t("removeConfirm")
                  : t("unpublishConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
