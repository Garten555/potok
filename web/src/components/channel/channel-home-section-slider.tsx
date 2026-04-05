"use client";

import Link from "next/link";
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

/** Сетка карточек как на главной сайта (YouTube-подобно), без горизонтального скролла. */
export function ChannelHomeSectionSlider({
  title,
  videos,
  channelName,
  nowMs,
  playAllHref,
  showPlayAllButton = true,
}: ChannelHomeSectionSliderProps) {
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
      </div>
      <div
        className={
          "grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-x-4 " +
          "lg:grid-cols-3 xl:grid-cols-4"
        }
      >
        {videos.map((video) => (
          <div key={video.id} className="min-w-0">
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
