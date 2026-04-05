"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { Search } from "lucide-react";
import { fuzzyFilterEntities } from "@/lib/fuzzy-text-search";
import { CommunityTab } from "@/components/channel/community-tab";
import { VideoGridCard } from "@/components/video/video-grid-card";
import { ChannelHomeSectionSlider } from "@/components/channel/channel-home-section-slider";
import type { ChannelHomeSectionResolved, ChannelPlaylistCard, ChannelVideoItem } from "@/lib/channel-home-types";
import { studioPathForNav } from "@/lib/studio-view-param";
import { ChannelSpotlightStrip, type SpotlightChannel } from "@/components/channel/channel-spotlight-strip";
import { YoutubeStylePlaylistThumbnail } from "@/components/playlist/youtube-style-playlist-thumbnail";

export type { ChannelPlaylistCard } from "@/lib/channel-home-types";

type ChannelTabsProps = {
  channelId: string;
  isOwner: boolean;
  channelName: string;
  channelHandle: string;
  subscribersCount: number;
  videosCount: number;
  /** Все видео канала для вкладки «Видео». */
  channelVideos: ChannelVideoItem[];
  channelPlaylists: ChannelPlaylistCard[];
  homeSections: ChannelHomeSectionResolved[];
  /** «Воспроизвести всё» для рядов-плейлистов (не для ряда «Все видео»). */
  showPlayAllOnHome?: boolean;
  /** Каналы для ряда «Другие каналы» (порядок и заголовок задаются в разделах главной). */
  spotlightChannels?: SpotlightChannel[];
};

type TabId = "home" | "videos" | "playlists" | "community" | "about";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "home", label: "Главная" },
  { id: "videos", label: "Видео" },
  { id: "playlists", label: "Плейлисты" },
  { id: "community", label: "Сообщество" },
  { id: "about", label: "О канале" },
];

/** Согласовано с CommunityTab: публикация постов только при ≥ этого числа подписчиков. */
const COMMUNITY_MIN_SUBSCRIBERS = 2;

export function ChannelTabs({
  channelId,
  isOwner,
  channelName,
  channelHandle,
  subscribersCount,
  videosCount,
  channelVideos,
  channelPlaylists,
  homeSections,
  showPlayAllOnHome = true,
  spotlightChannels = [],
}: ChannelTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [now, setNow] = useState(() => Date.now());
  const [videoSearchQ, setVideoSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const filteredChannelVideos = useMemo(() => {
    return fuzzyFilterEntities(
      channelVideos,
      (v) => v.id,
      (v) => [v.title],
      videoSearchQ,
    );
  }, [channelVideos, videoSearchQ]);

  const showCommunityTab = subscribersCount >= COMMUNITY_MIN_SUBSCRIBERS;

  const visibleTabs = useMemo(
    () => (showCommunityTab ? tabs : tabs.filter((t) => t.id !== "community")),
    [showCommunityTab],
  );

  useEffect(() => {
    if (!showCommunityTab && activeTab === "community") {
      setActiveTab("home");
    }
  }, [showCommunityTab, activeTab]);

  return (
    <>
      <div
        className="sticky -mx-4 z-[25] border-b border-white/10 bg-[#0c1120]/95 px-4 py-1 backdrop-blur-md sm:-mx-6 sm:px-6"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 3rem)" }}
      >
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          <nav className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Разделы канала">
            {visibleTabs.map((tab) => (
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
            <button
              type="button"
              aria-expanded={searchOpen}
              aria-label={searchOpen ? "Закрыть поиск по видео" : "Открыть поиск по видео на канале"}
              onClick={() => {
                setSearchOpen((o) => {
                  if (o) setVideoSearchQ("");
                  return !o;
                });
              }}
              className={clsx(
                "-mb-px flex h-[42px] w-10 shrink-0 items-center justify-center rounded-lg border-b-2 transition sm:h-[43px]",
                searchOpen
                  ? "border-cyan-400 text-cyan-100"
                  : "border-transparent text-slate-400 hover:border-white/20 hover:text-slate-200",
              )}
            >
              <Search className="h-5 w-5" aria-hidden />
            </button>
          </nav>
          {searchOpen ? (
            <div className="relative min-w-[min(100%,18rem)] flex-1 basis-full sm:basis-[min(100%,20rem)] sm:pl-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="h-4 w-4" aria-hidden />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={videoSearchQ}
                onChange={(e) => setVideoSearchQ(e.target.value)}
                placeholder="Поиск видео на канале"
                autoComplete="off"
                className="w-full rounded-lg border border-white/10 bg-[#0b1120] py-2 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                aria-label="Поиск видео на канале"
              />
            </div>
          ) : null}
        </div>
      </div>

      {activeTab === "home" ? (
        <div className="mt-2 space-y-5">
          {homeSections.length > 0 ? (
            <div className="space-y-5">
              {homeSections.map((section, idx) => {
                if (section.sectionKind === "spotlight") {
                  if (spotlightChannels.length === 0) return null;
                  return (
                    <ChannelSpotlightStrip
                      key={section.id ?? `spotlight-${idx}`}
                      title={section.displayTitle}
                      channels={spotlightChannels}
                    />
                  );
                }
                return (
                  <ChannelHomeSectionSlider
                    key={section.id ?? `section-${idx}-${section.playlistId ?? "u"}`}
                    title={section.displayTitle}
                    videos={section.videos}
                    channelName={channelName}
                    nowMs={now}
                    playAllHref={section.playAllHref}
                    showPlayAllButton={
                      section.sectionKind === "uploads" ? false : showPlayAllOnHome
                    }
                  />
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
              Пока нет контента для главной.
            </p>
          )}
        </div>
      ) : null}

      {activeTab === "videos" ? (
        <div className="mt-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
            Все видео
            {videoSearchQ.trim() ? (
              <span className="ml-2 text-sm font-normal text-slate-500">
                · найдено {filteredChannelVideos.length} из {channelVideos.length}
              </span>
            ) : null}
          </h2>
          {filteredChannelVideos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredChannelVideos.map((video) => (
                <VideoGridCard
                  key={video.id}
                  layout="channel"
                  videoId={video.id}
                  title={video.title}
                  thumbnailUrl={video.thumbnail_url}
                  views={video.views}
                  createdAt={video.created_at}
                  channelName={channelName}
                  nowMs={now}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
              {channelVideos.length === 0
                ? "На канале пока нет видео."
                : "Ничего не найдено — измените запрос поиска."}
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
              <Link href={studioPathForNav("playlists")} className="text-cyan-200 underline hover:text-cyan-100">
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
