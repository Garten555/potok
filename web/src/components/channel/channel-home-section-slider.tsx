"use client";

import { useCallback, useRef } from "react";
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

/** Горизонтальный ряд как на главной канала YouTube: свайп + стрелки на всех ширинах. */
export function ChannelHomeSectionSlider({
  title,
  videos,
  channelName,
  nowMs,
  playAllHref,
  showPlayAllButton = true,
}: ChannelHomeSectionSliderProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.75, 420) * dir;
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

  const showArrows = videos.length > 2;
  const showPlayAll = Boolean(playAllHref) && showPlayAllButton;

  return (
    <section className="min-w-0">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
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
        {showArrows ? (
          <div className="flex shrink-0 gap-1 self-end sm:self-center">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              className={clsx(
                "grid h-9 w-9 shrink-0 touch-manipulation place-items-center rounded-full border transition active:scale-[0.97] sm:h-10 sm:w-10",
                "border-cyan-400/20 bg-slate-950/60 text-cyan-200 shadow-[inset_0_1px_0_rgba(34,211,238,0.12)]",
                "hover:border-cyan-300/45 hover:bg-cyan-950/40 hover:text-cyan-50 hover:shadow-[0_0_18px_rgba(34,211,238,0.22)]",
              )}
              aria-label="Прокрутить ряд влево"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              className={clsx(
                "grid h-9 w-9 shrink-0 touch-manipulation place-items-center rounded-full border transition active:scale-[0.97] sm:h-10 sm:w-10",
                "border-cyan-400/20 bg-slate-950/60 text-cyan-200 shadow-[inset_0_1px_0_rgba(34,211,238,0.12)]",
                "hover:border-cyan-300/45 hover:bg-cyan-950/40 hover:text-cyan-50 hover:shadow-[0_0_18px_rgba(34,211,238,0.22)]",
              )}
              aria-label="Прокрутить ряд вправо"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        ) : null}
      </div>
      <div
        ref={scrollerRef}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]"
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
    </section>
  );
}
