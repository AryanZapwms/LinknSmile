// components/shop/shop-post-card.tsx
//
// One published post on the public shop page (app/shop/[slug]). Read-only:
// what it shows comes from lib/shop-page.ts, which has already dropped any
// video link that is not a plain https:// address.
import { PlayCircle } from "lucide-react";
import type { ShopPagePost } from "@/lib/shop-page";

interface ShopPostCardProps {
  post: ShopPagePost;
  /** The post's date, already formatted for the reader. */
  date: string;
  watchVideoLabel: string;
}

export function ShopPostCard({ post, date, watchVideoLabel }: ShopPostCardProps) {
  const single = post.images.length === 1;

  return (
    <article className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold break-words text-stone-900">{post.title}</h3>
      <p className="mt-0.5 text-xs text-stone-400">{date}</p>

      {post.text && (
        <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-line text-stone-600">
          {post.text}
        </p>
      )}

      {/* Plain <img>, not next/image: until the posts screen stores these
          itself, a post's image can sit on any host, and next/image throws
          for a host that next.config.mjs does not list. */}
      {post.images.length > 0 && (
        <div className={`mt-4 grid gap-2 ${single ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
          {post.images.map((src, index) => (
            <img
              key={index}
              src={src}
              alt={post.title}
              loading="lazy"
              className={`w-full rounded-xl bg-stone-100 object-cover ${single ? "max-h-96" : "aspect-square"}`}
            />
          ))}
        </div>
      )}

      {post.videoUrl && (
        <a
          href={post.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
        >
          <PlayCircle className="h-4 w-4" /> {watchVideoLabel}
        </a>
      )}
    </article>
  );
}
