"use client";

import { useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { CommunityTab } from "@/components/channel/community-tab";

type VideoItem = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  created_at: string;
};

export type ChannelPlaylistCard = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  created_at: string;
  videos_count: number;
  thumbnail_url: string | null;
  first_video_id: string | null;
};

type ChannelTabsProps = {
  channelId: string;
  isOwner: boolean;
  channelName: string;
  channelHandle: string;
  subscribersCount: number;
  videosCount: number;
  latestVideos: VideoItem[];
  channelPlaylists: ChannelPlaylistCard[];
};

type TabId = "home" | "videos" | "playlists" | "community" | "about";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "home", label: "Главная" },
  { id: "videos", label: "Видео" },
  { id: "playlists", label: "Плейлисты" },
  { id: "community", label: "Сообщество" },
  { id: "about", label: "О канале" },
];

function ChannelVideoCard({ video, channelName }: { video: VideoItem; channelName: string }) {
  const publishedLabel = new Date(video.created_at).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <Link
      href={`/watch/${video.id}`}
      className="group block overflow-hidden rounded-xl bg-[#0f1628] ring-1 ring-white/[0.06] transition hover:ring-cyan-400/25"
    >
      <div
        className="aspect-video w-full bg-[#0b1323] bg-cover bg-center transition duration-200 group-hover:opacity-95"
        style={video.thumbnail_url ? { backgroundImage: `url(${video.thumbnail_url})` } : undefined}
      />
      <div className="p-3 pt-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-100 group-hover:text-cyan-200">
          {video.title}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-slate-400">
          <span className="text-slate-300">{channelName}</span>
          <span className="mx-1 text-slate-600">·</span>
          {video.views.toLocaleString("ru-RU")} просмотров
          <span className="mx-1 text-slate-600">·</span>
          {publishedLabel}
        </p>
      </div>
    </Link>
  );
}

function PlaylistStackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {/* Иконка в духе YouTube: список + play */}
      <path d="M4 6h16v1.8H4V6zm0 5.1h16v1.8H4v-1.8zm0 5.1h11v1.8H4v-1.8z" />
      <path d="M17.2 13.2 21 16l-3.8 2.8v-5.6z" />
    </svg>
  );
}

/** Превью плейлиста в духе YouTube: слева кадр, справа тёмная полоса с иконкой и числом роликов. */
function YoutubeStylePlaylistThumbnail({
  thumbnailUrl,
  videosCount,
  title,
}: {
  thumbnailUrl: string | null;
  videosCount: number;
  title: string;
}) {
  return (
    <div className="relative flex aspect-video w-full overflow-hidden rounded-lg bg-[#212121] shadow-inner ring-1 ring-black/40">
      <div className="relative min-h-0 min-w-0 flex-1">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full min-h-[120px] w-full items-center justify-center bg-gradient-to-br from-[#2a2a2a] to-[#141414] text-xs text-slate-500">
            Нет обложки
          </div>
        )}
      </div>
      <div
        className="flex w-[26%] max-w-[118px] min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 border-l border-black/50 bg-[#1a1a1a] px-1.5 py-3 text-white sm:min-w-[80px]"
        title={`${videosCount} видео в плейлисте «${title}»`}
      >
        <PlaylistStackIcon className="h-7 w-7 shrink-0 opacity-90 sm:h-8 sm:w-8" />
        <span className="text-base font-bold tabular-nums leading-none sm:text-lg">{videosCount}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/65">видео</span>
      </div>
    </div>
  );
}

export function ChannelTabs({
  channelId,
  isOwner,
  channelName,
  channelHandle,
  subscribersCount,
  videosCount,
  latestVideos,
  channelPlaylists,
}: ChannelTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <>
      <div className="-mx-1 border-b border-white/10">
        <nav className="flex flex-wrap gap-1 px-1" aria-label="Разделы канала">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-4 sm:text-[15px]",
                activeTab === tab.id
                  ? "border-cyan-400 text-cyan-100"
                  : "border-transparent text-slate-400 hover:border-white/20 hover:text-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "home" ? (
        <div className="mt-6 space-y-8">
          <p className="text-sm leading-relaxed text-slate-400">
            <span className="font-medium text-slate-100">{subscribersCount.toLocaleString("ru-RU")}</span>{" "}
            подписчиков
            <span className="mx-2 text-slate-600">·</span>
            <span className="font-medium text-slate-100">{videosCount.toLocaleString("ru-RU")}</span> видео
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-cyan-200/90">@{channelHandle}</span>
          </p>

          <section>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">Видео канала</h2>
              <button
                type="button"
                onClick={() => setActiveTab("videos")}
                className="text-left text-sm font-medium text-cyan-100/90 transition hover:text-cyan-50 sm:text-right"
              >
                Все видео →
              </button>
            </div>
            {latestVideos.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {latestVideos.map((video) => (
                  <ChannelVideoCard key={video.id} video={video} channelName={channelName} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
                Пока нет загруженных видео. Добавьте первый ролик в студии.
              </p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "videos" ? (
        <div className="mt-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">Все видео</h2>
          {latestVideos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestVideos.map((video) => (
                <ChannelVideoCard key={video.id} video={video} channelName={channelName} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
              На канале пока нет видео.
            </p>
          )}
        </div>
      ) : null}

      {activeTab === "playlists" ? (
        <div className="mt-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">Плейлисты канала</h2>
          {channelPlaylists.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {channelPlaylists.map((pl) => {
                const href =
                  pl.first_video_id && pl.videos_count > 0
                    ? `/watch/${pl.first_video_id}?list=${pl.id}`
                    : undefined;
                const visibilityLabel =
                  pl.visibility === "private"
                    ? "Приватный плейлист"
                    : pl.visibility === "unlisted"
                      ? "Доступ по ссылке"
                      : null;
                const inner = (
                  <>
                    <YoutubeStylePlaylistThumbnail
                      thumbnailUrl={pl.thumbnail_url}
                      videosCount={pl.videos_count}
                      title={pl.title}
                    />
                    <div className="mt-2.5 min-w-0 px-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Плейлист</p>
                      <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-100 transition group-hover:text-cyan-200 sm:text-[15px]">
                        {pl.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                        <span className="text-slate-300">{channelName}</span>
                        {visibilityLabel ? (
                          <>
                            <span className="mx-1 text-slate-600">·</span>
                            {visibilityLabel}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </>
                );
                return href ? (
                  <Link
                    key={pl.id}
                    href={href}
                    className="group block rounded-xl p-1.5 transition hover:bg-white/[0.04]"
                    aria-label={`Плейлист: ${pl.title}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={pl.id} className="block rounded-xl p-1.5 opacity-90" aria-label={`Плейлист: ${pl.title}`}>
                    {inner}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              Пока нет плейлистов канала. Создайте их в{" "}
              <Link href="/studio?tab=playlists" className="text-cyan-200 underline hover:text-cyan-100">
                студии
              </Link>
              .
            </p>
          )}
        </div>
      ) : null}

      {activeTab === "community" ? (
        <CommunityTab channelId={channelId} isOwner={isOwner} subscribersCount={subscribersCount} />
      ) : null}

      {activeTab === "about" ? (
        <div className="mt-6 max-w-xl space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-300">
          <p>
            Канал <span className="font-medium text-slate-100">{channelName}</span>
          </p>
          <p>
            Ссылка: <span className="text-cyan-200">@{channelHandle}</span>
          </p>
          <p>Подписчиков: {subscribersCount.toLocaleString("ru-RU")}</p>
        </div>
      ) : null}
    </>
  );
}
