"use client";

import Link from "next/link";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { formatPublishedAgo } from "@/lib/format-published-ago";
import { formatViewCountRu } from "@/lib/format-view-count-ru";

export type VideoGridCardProps = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  views: number | null | undefined;
  createdAt: string;
  channelName: string;
  /** Передавайте `Date.now()` из state, обновляйте раз в минуту — подписи «N минут назад» остаются актуальными. */
  nowMs: number;
  /**
   * `home` — аватар канала слева (главная), в метаданных: канал · просмотры · время.
   * `channel` — без авatars: только название ролика и «просмотры · время» (имя канала на странице и так в шапке).
   */
  layout?: "home" | "channel";
  /** Для `layout="home"` — URL аватарки канала. */
  avatarUrl?: string | null;
};

/**
 * Карточка ролика в сетке: превью сверху, блок текста снизу.
 */
export function VideoGridCard({
  videoId,
  title,
  thumbnailUrl,
  views,
  createdAt,
  channelName,
  nowMs,
  layout = "channel",
  avatarUrl,
}: VideoGridCardProps) {
  const publishedLabel = formatPublishedAgo(createdAt, nowMs);
  const viewsLabel = formatViewCountRu(views);
  const metaChannel =
    layout === "home" ? (
      <>
        <span className="text-slate-300">{channelName}</span>
        <span className="mx-1 text-slate-600">·</span>
      </>
    ) : null;

  const metaTail = (
    <>
      {metaChannel}
      {viewsLabel}
      {publishedLabel ? (
        <>
          <span className="mx-1 text-slate-600">·</span>
          {publishedLabel}
        </>
      ) : null}
    </>
  );

  return (
    <Link
      href={`/watch/${videoId}`}
      className="group block overflow-hidden rounded-xl bg-[#0f1628] ring-1 ring-white/[0.06] transition hover:ring-cyan-400/25"
    >
      <div
        className="aspect-video w-full bg-[#0b1323] bg-cover bg-center transition duration-200 group-hover:opacity-95"
        style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
      />
      {layout === "home" ? (
        <div className="flex gap-3 p-3 pt-2.5">
          <ChannelAvatar
            channelName={channelName}
            avatarUrl={avatarUrl ?? null}
            className="!h-9 !w-9 shrink-0 !text-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-100 group-hover:text-cyan-200">
              {title}
            </p>
            <p className="mt-1 line-clamp-1 text-xs text-slate-400">{metaTail}</p>
          </div>
        </div>
      ) : (
        <div className="p-3 pt-2">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-100 group-hover:text-cyan-200">
            {title}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-slate-400">{metaTail}</p>
        </div>
      )}
    </Link>
  );
}
