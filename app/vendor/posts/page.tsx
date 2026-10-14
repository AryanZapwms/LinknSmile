// app/vendor/posts/page.tsx
//
// A vendor's posts for their public shop page (app/shop/[slug]): the list,
// with publish / unpublish / delete, and the editor dialog
// (components/shop/post-editor.tsx) for writing one. Data: /api/vendor/posts.
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Images,
  Info,
  Newspaper,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PostEditor } from "@/components/shop/post-editor";
import { LOCALE } from "@/lib/currency";
import { POSTS_PER_SHOP_MAX } from "@/lib/shop-post-rules";
import type { StoreType } from "@/lib/shop-store-type";
import type { ShopPostView } from "@/lib/shop-posts";

export default function VendorPostsPage() {
  const t = useTranslations("VendorPostsPage");
  const [posts, setPosts] = useState<ShopPostView[]>([]);
  const [storeType, setStoreType] = useState<StoreType>("products");
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // The editor's post: one being edited, "new", or null when closed. It is
  // not replaced while the dialog is open, so the form is never reset under
  // the vendor; what the server accepted arrives through upsert below.
  const [editing, setEditing] = useState<ShopPostView | "new" | null>(null);
  const [deleting, setDeleting] = useState<ShopPostView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch("/api/vendor/posts");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("load failed");
      setPosts(data.posts ?? []);
      setStoreType(data.storeType ?? "products");
      setShopSlug(data.shopSlug ?? null);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  /** Puts a post the server returned into the list (new ones first). */
  const upsert = (post: ShopPostView) =>
    setPosts((prev) =>
      prev.some((p) => p._id === post._id)
        ? prev.map((p) => (p._id === post._id ? post : p))
        : [post, ...prev]
    );

  const setStatus = async (post: ShopPostView, status: "draft" | "published") => {
    setBusyId(post._id);
    try {
      const res = await fetch(`/api/vendor/posts/${post._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.post) throw new Error("status change failed");
      upsert(data.post);
      toast.success(status === "published" ? t("publishedToast") : t("unpublishedToast"));
    } catch (error) {
      console.error("Failed to change post status:", error);
      toast.error(t("actionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const post = deleting;
    if (!post) return;
    setDeleting(null);
    setBusyId(post._id);
    try {
      const res = await fetch(`/api/vendor/posts/${post._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setPosts((prev) => prev.filter((p) => p._id !== post._id));
      toast.success(t("deletedToast"));
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast.error(t("actionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (post: ShopPostView) => {
    if (post.status === "published") {
      return <Badge className="bg-green-600 text-white">{t("statusPublished")}</Badge>;
    }
    if (post.status === "removed") {
      return <Badge variant="destructive">{t("statusRemoved")}</Badge>;
    }
    return <Badge variant="outline">{t("statusDraft")}</Badge>;
  };

  const atLimit = posts.length >= POSTS_PER_SHOP_MAX;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {shopSlug && (
            <Button variant="outline" asChild>
              <Link href={`/shop/${shopSlug}`} target="_blank">
                <ExternalLink className="me-2 h-4 w-4" />
                {t("viewShopPage")}
              </Link>
            </Button>
          )}
          <Button onClick={() => setEditing("new")} disabled={loading || loadFailed || atLimit}>
            <Plus className="me-2 h-4 w-4" />
            {t("newPost")}
          </Button>
        </div>
      </div>

      {/* A Products shop's page never shows posts: say so before they write one. */}
      {!loading && !loadFailed && storeType === "products" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{t("productsShopNote")}</p>
            <Link href="/vendor/settings" className="mt-1 inline-block font-semibold underline">
              {t("productsShopLink")}
            </Link>
          </div>
        </div>
      )}

      {atLimit && (
        <div className="flex items-start gap-3 rounded-lg border p-4 text-sm">
          <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("limitReached", { max: POSTS_PER_SHOP_MAX })}</p>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : loadFailed ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="text-muted-foreground mx-auto mb-4 h-10 w-10" />
            <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
            <Button variant="outline" onClick={fetchPosts}>
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Newspaper className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="mb-1 font-semibold">{t("emptyTitle")}</p>
            <p className="text-muted-foreground mb-4 text-sm">{t("emptyBody")}</p>
            <Button onClick={() => setEditing("new")}>
              <Plus className="me-2 h-4 w-4" />
              {t("newPost")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const busy = busyId === post._id;
            const removed = post.status === "removed";
            return (
              <Card key={post._id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                  <div className="bg-muted flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    {post.images[0] ? (
                      <Image
                        src={post.images[0]}
                        alt=""
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Newspaper className="text-muted-foreground h-8 w-8" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold break-words">{post.title}</h2>
                      {statusBadge(post)}
                    </div>
                    {post.text && (
                      <p className="text-muted-foreground line-clamp-2 text-sm break-words whitespace-pre-line">
                        {post.text}
                      </p>
                    )}
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span>
                        {new Date(post.createdAt).toLocaleDateString(LOCALE, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {post.images.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Images className="h-3.5 w-3.5" />
                          {t("pictureCount", { count: post.images.length })}
                        </span>
                      )}
                      {post.videoUrl && (
                        <span className="flex items-center gap-1">
                          <PlayCircle className="h-3.5 w-3.5" />
                          {t("hasVideo")}
                        </span>
                      )}
                    </div>

                    {/* What an admin did, and why. */}
                    {post.moderation && (
                      <div
                        className={`rounded-md border p-3 text-sm ${
                          removed
                            ? "border-red-200 bg-red-50 text-red-900"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        <p className="font-medium break-words">
                          {t(removed ? "removedByAdmin" : "unpublishedByAdmin", {
                            reason: post.moderation.reason,
                          })}
                        </p>
                        <p className="mt-0.5 text-xs">
                          {t(removed ? "removedHint" : "unpublishedHint")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-start gap-2 sm:flex-col">
                    {!removed && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setEditing(post)} disabled={busy}>
                          <Pencil className="me-2 h-4 w-4" />
                          {t("edit")}
                        </Button>
                        {post.status === "published" ? (
                          <Button variant="outline" size="sm" onClick={() => setStatus(post, "draft")} disabled={busy}>
                            <EyeOff className="me-2 h-4 w-4" />
                            {t("unpublish")}
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setStatus(post, "published")} disabled={busy}>
                            <Eye className="me-2 h-4 w-4" />
                            {t("publish")}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleting(post)}
                      disabled={busy}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {t("delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PostEditor
        post={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={upsert}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteBody", { title: deleting?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
