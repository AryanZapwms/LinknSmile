// components/shop/shop-posts-grid.tsx
//
// The Posts section of the public shop page (app/shop/[slug]): a grid of
// square tiles, newest first, like an Instagram profile. A tile shows the
// post's first picture, or its title and the start of its text when it has
// none. Clicking a tile opens the post in a dialog
// (components/shop/shop-post-modal.tsx), where the previous / next post can
// be reached without closing it.
//
// The server renders the first page of posts (lib/shop-page.ts); "Load more"
// asks /api/shops/[slug]/posts for the next one. The open post is kept in
// the address as ?post=<id>, so the link can be shared: opening it opens
// that post, fetching it first when it is not on the first page. The address
// is changed with history.replaceState, which neither reloads the page nor
// adds Back-button steps.
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Copy, PlayCircle } from "lucide-react";
import { ShopPostModal } from "@/components/shop/shop-post-modal";
import type { ShopPagePost } from "@/lib/shop-page";

interface ShopPostsGridProps {
  shopSlug: string;
  initialPosts: ShopPagePost[];
  /** For the page after the first; null when there is none. */
  initialCursor: string | null;
}

const POST_PARAM = "post";

/** Puts the open post in the address bar, or takes it out. */
function setPostInUrl(postId: string | null) {
  const url = new URL(window.location.href);
  if (postId) url.searchParams.set(POST_PARAM, postId);
  else url.searchParams.delete(POST_PARAM);
  window.history.replaceState(null, "", url);
}

export function ShopPostsGrid({ shopSlug, initialPosts, initialCursor }: ShopPostsGridProps) {
  const t = useTranslations("ShopPage");
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  // A post opened from a shared link that is not in the grid (yet).
  const [linkedPost, setLinkedPost] = useState<ShopPagePost | null>(null);

  const tiles = useRef(new Map<string, HTMLButtonElement>());
  // The last post shown in the dialog: its tile gets focus back on close,
  // even after moving through other posts. (openId is already null by then.)
  const lastShownId = useRef<string | null>(null);
  const postsApi = `/api/shops/${encodeURIComponent(shopSlug)}/posts`;

  const openIndex = openId ? posts.findIndex((p) => p._id === openId) : -1;
  const openPost =
    openIndex >= 0 ? posts[openIndex] : linkedPost && linkedPost._id === openId ? linkedPost : null;

  const open = (postId: string) => {
    lastShownId.current = postId;
    setOpenId(postId);
    setPostInUrl(postId);
  };
  const close = () => {
    setOpenId(null);
    setPostInUrl(null);
  };

  /** Adds the next page to the grid and returns its posts (none on failure). */
  const loadMore = async (): Promise<ShopPagePost[]> => {
    if (!cursor || loadingMore) return [];
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const res = await fetch(`${postsApi}?cursor=${encodeURIComponent(cursor)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.posts)) throw new Error("load more failed");
      const added: ShopPagePost[] = data.posts;
      // A post first opened from a link may now arrive in a page: no duplicates.
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        return [...prev, ...added.filter((p) => !seen.has(p._id))];
      });
      setCursor(data.nextCursor ?? null);
      return added;
    } catch (error) {
      console.error("Failed to load more posts:", error);
      setLoadMoreFailed(true);
      return [];
    } finally {
      setLoadingMore(false);
    }
  };

  const hasPrevious = openIndex > 0;
  // Past the last loaded post, "next" loads the next page first.
  const hasNext = openIndex >= 0 && (openIndex < posts.length - 1 || cursor !== null);
  const showPrevious = () => hasPrevious && open(posts[openIndex - 1]._id);
  const showNext = async () => {
    if (openIndex < 0) return;
    if (openIndex < posts.length - 1) return open(posts[openIndex + 1]._id);
    const added = await loadMore();
    if (added[0]) open(added[0]._id);
  };

  // A shared link (?post=<id>) opens that post once the page has loaded.
  const firstPage = useRef(initialPosts);
  useEffect(() => {
    const postId = new URLSearchParams(window.location.search).get(POST_PARAM);
    if (!postId) return;
    if (firstPage.current.some((p) => p._id === postId)) {
      lastShownId.current = postId;
      setOpenId(postId);
      return;
    }
    let cancelled = false;
    fetch(`${postsApi}?${POST_PARAM}=${encodeURIComponent(postId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.post) {
          lastShownId.current = data.post._id;
          setLinkedPost(data.post);
          setOpenId(data.post._id);
        } else {
          // Deleted, unpublished or never existed: just show the page.
          setPostInUrl(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postsApi]);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1 sm:gap-2">
        {posts.map((post) => {
          const cover = post.images[0];
          return (
            <li key={post._id}>
              <button
                ref={(el) => {
                  if (el) tiles.current.set(post._id, el);
                  else tiles.current.delete(post._id);
                }}
                type="button"
                onClick={() => open(post._id)}
                aria-haspopup="dialog"
                aria-label={t("openPost", { title: post.title })}
                className="group relative block aspect-square w-full overflow-hidden rounded-md bg-stone-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none sm:rounded-lg"
              >
                {cover ? (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 33vw, 300px"
                    className="object-cover"
                  />
                ) : (
                  // A post with only text: its title and the start of its text.
                  <span className="flex h-full w-full flex-col justify-center gap-1 bg-gradient-to-br from-amber-50 to-stone-100 p-2 text-start sm:gap-1.5 sm:p-4">
                    <span className="line-clamp-2 text-xs font-bold break-words text-stone-800 sm:text-sm">
                      {post.title}
                    </span>
                    {post.text && (
                      <span className="line-clamp-2 text-[11px] leading-snug break-words text-stone-500 sm:line-clamp-3 sm:text-xs">
                        {post.text}
                      </span>
                    )}
                  </span>
                )}

                {/* Corner marks: several pictures, a video link. */}
                {(post.images.length > 1 || post.videoUrl) && (
                  <span className="absolute end-1.5 top-1.5 flex gap-1 text-white drop-shadow sm:end-2 sm:top-2">
                    {post.videoUrl && <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />}
                    {post.images.length > 1 && <Copy className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />}
                  </span>
                )}

                {/* On hover (and keyboard focus), a picture tile shows the title. */}
                {cover && (
                  <span className="pointer-events-none absolute inset-0 flex items-end bg-black/40 p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 sm:p-3">
                    <span className="line-clamp-2 text-start text-xs font-semibold break-words text-white sm:text-sm">
                      {post.title}
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {cursor && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => loadMore()}
            disabled={loadingMore}
            className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            {loadingMore ? t("loadingMorePosts") : t("loadMorePosts")}
          </button>
          {loadMoreFailed && <p className="text-sm text-red-600">{t("loadMorePostsFailed")}</p>}
        </div>
      )}

      <ShopPostModal
        post={openPost}
        onClose={close}
        onPrevious={hasPrevious ? showPrevious : null}
        onNext={hasNext ? () => void showNext() : null}
        returnFocusTo={() =>
          lastShownId.current ? (tiles.current.get(lastShownId.current) ?? null) : null
        }
      />
    </>
  );
}
