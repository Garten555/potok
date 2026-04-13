"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { VideoGridCard } from "@/components/video/video-grid-card";
import type { ChannelVideoItem } from "@/lib/channel-home-types";

type ChannelHomeSectionSliderProps = {
  title: string;
  videos: ChannelVideoItem[];
  channelName: string;
  nowMs: number;
  playAllHref: string | null;
  /** Показывать ссылку «Воспроизвести всё» (отключается в студии). */
  showPlayAllButton?: boolean;
};

/** Горизонтальный ряд как на главной канала YouTube: стрелки по краям поверх ряда, по центру по вертикали. */
export function ChannelHomeSectionSlider({
  title,
  videos,
  channelName,
  nowMs,
  playAllHref,
  showPlayAllButton = true,
}: ChannelHomeSectionSliderProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(max > 2 && scrollLeft < max - 2);
  }, []);

  useLayoutEffect(() => {
    updateScrollState();
    const id = requestAnimationFrame(() => updateScrollState());
    return () => cancelAnimationFrame(id);
  }, [updateScrollState, videos.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, videos.length]);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.85, 480) * dir;
    el.scrollBy({ left: step, behavior: "smooth" });
  }, []);

  if (videos.length === 0) {
    return (
      <section className="min-w-0">
        <h2 className="mb-2 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">{title}</h2>
        <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
          В этом разделе пока нет видео.
        </p>
      </section>
    );
  }

  /** Стрелки только при 4+ видео — при 1–3 карточках ряд обычно помещается без скролла. */
  const showOverlayArrows = videos.length > 3;
  const showPlayAll = Boolean(playAllHref) && showPlayAllButton;

  /** Когда ряд целиком помещается без скролла, переполнения нет — стрелки всё равно показываем, но приглушённые (как подсказка UI). */
  const arrowBtnClass = (enabled: boolean) =>
    clsx(
      "absolute top-1/2 z-30 grid h-10 w-10 -translate-y-1/2 touch-manipulation place-items-center rounded-full text-white shadow-lg transition sm:h-11 sm:w-11",
      "bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40",
      enabled
        ? "cursor-pointer opacity-100 hover:bg-black/88 active:scale-[0.96]"
        : "cursor-default opacity-[0.38] saturate-50",
    );

  return (
    <section className="min-w-0">
      <div className="mb-3 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 sm:mb-4">
        <h2 className="min-w-0 text-xl font-bold leading-tight tracking-tight text-slate-50 sm:text-2xl">{title}</h2>
        {showPlayAll ? (
          <Link
            href={playAllHref!}
            className="shrink-0 text-xl font-bold leading-tight tracking-tight text-slate-500 transition hover:text-slate-300 sm:text-2xl"
          >
            Воспроизвести всё
          </Link>
        ) : null}
      </div>

      <div className="relative min-h-0 min-w-0">
        {showOverlayArrows ? (
          <>
            <button
              type="button"
              aria-label="Прокрутить ряд влево"
              onClick={() => scrollByPage(-1)}
              disabled={!canScrollLeft}
              className={clsx(arrowBtnClass(canScrollLeft), "left-0 sm:left-1")}
            >
              <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="Прокрутить ряд вправо"
              onClick={() => scrollByPage(1)}
              disabled={!canScrollRight}
              className={clsx(arrowBtnClass(canScrollRight), "right-0 sm:right-1")}
            >
              <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} />
            </button>
          </>
        ) : null}

        <div
          ref={scrollerRef}
          className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-1 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {videos.map((video) => (
            <div
              key={video.id}
              className="w-[min(calc(100vw-2.5rem),280px)] shrink-0 snap-start sm:w-[300px]"
            >
              <VideoGridCard
                layout="channel"
                videoId={video.id}
                title={video.title}
                thumbnailUrl={video.thumbnail_url}
                views={video.views}
                createdAt={video.created_at}
                channelName={channelName}
                nowMs={nowMs}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
