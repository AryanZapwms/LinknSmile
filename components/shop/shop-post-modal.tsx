// components/shop/shop-post-modal.tsx
//
// One post of the public shop page, full size, in a dialog over the page:
// its pictures (swipe on a phone, arrows on a larger screen), title, date,
// full text and video link. Opened from the posts grid
// (components/shop/shop-posts-grid.tsx), which owns which post is open.
//
// Built on the project's dialog (components/ui/dialog.tsx, Radix), which
// already closes on Escape and on a click outside, locks the page scroll,
// keeps focus inside while open and labels itself as a modal dialog.
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ChevronLeft, ChevronRight, PlayCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOCALE } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { ShopPagePost } from "@/lib/shop-page";

interface ShopPostModalProps {
  /** The open post, or null when closed. */
  post: ShopPagePost | null;
  onClose: () => void;
  /** Move to the post before / after this one; null when there is none. */
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  /** Where focus goes when the dialog closes (the open post's tile). */
  returnFocusTo: () => HTMLElement | null;
}

export function ShopPostModal({
  post,
  onClose,
  onPrevious,
  onNext,
  returnFocusTo,
}: ShopPostModalProps) {
  const t = useTranslations("ShopPage");
  const strip = useRef<HTMLDivElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  // The post on screen. It stays after `post` goes back to null, so the
  // dialog can play its closing animation and hand focus back properly.
  const [shown, setShown] = useState<ShopPagePost | null>(post);
  if (post && post !== shown) setShown(post);

  // Each post starts on its first picture.
  useEffect(() => {
    setImageIndex(0);
    strip.current?.scrollTo({ left: 0 });
  }, [shown?._id]);

  if (!shown) return null;

  const images = shown.images;
  const hasImages = images.length > 0;

  // The picture strip is a horizontal scroll-snap row: a finger swipe moves
  // it natively, the arrow buttons scroll it, and the scroll position says
  // which picture is showing. It is laid out left to right in every
  // language, so this arithmetic never has to deal with RTL scrolling.
  const showImage = (index: number) => {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };
  const onStripScroll = () => {
    const el = strip.current;
    if (el && el.clientWidth > 0) setImageIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  // Left/right arrow keys move between posts. In a right-to-left language the
  // next post is to the left.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const rtl = document.documentElement.dir === "rtl";
    const forward = (event.key === "ArrowRight") !== rtl;
    const move = forward ? onNext : onPrevious;
    event.preventDefault();
    move?.();
  };

  const date = new Date(shown.createdAt).toLocaleDateString(LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={post !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-modal="true"
        onKeyDown={onKeyDown}
        onCloseAutoFocus={(event) => {
          const target = returnFocusTo();
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
        className={cn(
          "flex max-h-[92vh] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-[calc(100%-2rem)]",
          hasImages ? "md:max-w-5xl md:flex-row md:overflow-hidden" : "md:max-w-xl"
        )}
      >
        {/* First in the dialog, so it is where focus lands on open. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closePost")}
          className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <X className="h-5 w-5" />
        </button>

        {hasImages && (
          <div className="relative shrink-0 bg-stone-950 md:w-[60%]">
            <div
              ref={strip}
              onScroll={onStripScroll}
              dir="ltr"
              className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:aspect-auto md:h-[min(92vh,40rem)] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((src, index) => (
                <div key={src} className="relative h-full w-full shrink-0 snap-center">
                  <Image
                    src={src}
                    alt={t("postImageAlt", { title: shown.title, number: index + 1 })}
                    fill
                    sizes="(max-width: 768px) 100vw, 640px"
                    className="object-contain"
                    priority={index === 0}
                  />
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <>
                {/* Arrows for a mouse; on a phone the strip is swiped. */}
                <button
                  type="button"
                  onClick={() => showImage(Math.max(imageIndex - 1, 0))}
                  disabled={imageIndex === 0}
                  aria-label={t("previousImage")}
                  className="absolute top-1/2 left-2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-800 shadow transition-opacity hover:bg-white disabled:opacity-0 md:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => showImage(Math.min(imageIndex + 1, images.length - 1))}
                  disabled={imageIndex === images.length - 1}
                  aria-label={t("nextImage")}
                  className="absolute top-1/2 right-2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-800 shadow transition-opacity hover:bg-white disabled:opacity-0 md:flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div
                  dir="ltr"
                  className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
                  aria-label={t("imageCounter", { current: imageIndex + 1, total: images.length })}
                  role="group"
                >
                  {images.map((src, index) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => showImage(index)}
                      aria-label={t("showImage", { number: index + 1 })}
                      aria-current={index === imageIndex}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        index === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col p-5 md:min-h-0 md:p-6">
          <div className="pe-10 md:min-h-0 md:flex-1 md:overflow-y-auto">
            <DialogTitle className="text-lg leading-snug font-bold break-words text-stone-900">
              {shown.title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-stone-400">{date}</DialogDescription>

            {shown.text && (
              <p className="mt-4 text-sm leading-relaxed break-words whitespace-pre-line text-stone-700">
                {shown.text}
              </p>
            )}

            {shown.videoUrl && (
              <a
                href={shown.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <PlayCircle className="h-4 w-4" /> {t("watchVideo")}
              </a>
            )}
          </div>

          {(onPrevious || onNext) && (
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => onPrevious?.()}
                disabled={!onPrevious}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:invisible"
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("previousPost")}
              </button>
              <button
                type="button"
                onClick={() => onNext?.()}
                disabled={!onNext}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:invisible"
              >
                {t("nextPost")} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
