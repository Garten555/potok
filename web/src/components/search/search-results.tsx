"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { SlidersHorizontal, Video, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthState } from "@/components/auth/auth-context";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { SearchChannelShelf } from "@/components/search/search-channel-shelf";
import { SearchVideoCardMenu } from "@/components/search/search-video-card-menu";
import { useRouter, useSearchParams } from "next/navigation";
import {
  channelHandleBoost,
  extractTokens,
  matchStrength,
  recencyBoost,
  tokenHitsInText,
  viewsSoftBoost,
} from "@/lib/search-relevance";

type SearchResultsProps = {
  query: string;
};

type VideoRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number | null;
  created_at: string;
  user_id: string;
  channel_name?: string | null;
  channel_handle?: string | null;
  channel_avatar_url?: string | null;
  description: string | null;
  tags: string[] | null;
  visibility: string;
};

type ChannelRow = {
  id: string;
  channel_name: string;
  channel_handle: string | null;
  avatar_url: string | null;
  subscribers_count: number;
  created_at?: string | null;
};

/** Лучший совпадающий канал для «полки» (ник / имя), как на YouTube. */
function pickFeaturedChannel(q: string, channels: ChannelRow[]): ChannelRow | null {
  const qn = q.trim().toLowerCase().replace(/^@/, "");
  if (!qn || channels.length === 0) return null;
  const ch = channels[0];
  const h = (ch.channel_handle ?? "").toLowerCase();
  const n = ch.channel_name.trim().toLowerCase();
  if (h && h === qn) return ch;
  if (n === qn) return ch;
  if (h && h.length >= 2 && (h.startsWith(qn) || (qn.length >= 2 && qn.startsWith(h)))) return ch;
  if (qn.length >= 2 && n.startsWith(qn)) return ch;
  const nameScore = matchStrength(q, ch.channel_name);
  if (nameScore >= 100 && qn.length >= 3) return ch;
  if (h && qn.length >= 3 && (h.includes(qn) || qn.includes(h))) return ch;
  return null;
}

export function SearchResults({ query }: SearchResultsProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { isAuthenticated } = useAuthState();
  const router = useRouter();
  const params = useSearchParams();

  const kind = params.get("kind") ?? "all"; // all | videos | channels
  const sort = params.get("sort") ?? "relevance"; // relevance | new | popular

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = filterRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setIsFilterOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [isFilterOpen]);

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [featuredChannel, setFeaturedChannel] = useState<ChannelRow | null>(null);
  const [shelfVideos, setShelfVideos] = useState<VideoRow[]>([]);
  const [featuredSubscribed, setFeaturedSubscribed] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setVideos([]);
      setChannels([]);
      setFeaturedChannel(null);
      setShelfVideos([]);
      setViewerId(null);
      return;
    }

    const run = async () => {
      setIsLoading(true);
      try {
        const tokens = extractTokens(q);

        const { data: authSession } = await supabase.auth.getUser();
        const authUser = authSession.user;
        setViewerId(authUser?.id ?? null);

        let likedIds = new Set<string>();
        let watchedIds = new Set<string>();

        if (isAuthenticated && authUser) {
            const { data: likedRows } = await supabase
              .from("likes")
              .select("video_id")
              .eq("user_id", authUser.id)
              .eq("type", "like");
            likedIds = new Set((likedRows ?? []).map((r) => String((r as { video_id: string }).video_id)));

            const { data: watchedRows } = await supabase
              .from("watch_history")
              .select("video_id")
              .eq("user_id", authUser.id)
              .order("watched_at", { ascending: false })
              .limit(40);
            watchedIds = new Set(
              (watchedRows ?? []).map((r) => String((r as { video_id: string }).video_id)),
            );
        }

        const { data: videosRaw } = await supabase
          .from("videos")
          .select("id,title,thumbnail_url,views,created_at,user_id,description,tags,visibility")
          .in("visibility", ["public", "unlisted"])
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(96);

        const rawVideos = (videosRaw ?? []) as unknown as VideoRow[];

        // Подтягиваем данные канала для отображения рядом с видео.
        const userIds = Array.from(new Set(rawVideos.map((v) => v.user_id)));
        const { data: usersRows } = userIds.length
          ? await supabase
              .from("users")
              .select("id,channel_name,channel_handle,avatar_url")
              .in("id", userIds)
          : { data: [] };
        const usersById = new Map<
          string,
          { channel_name: string | null; channel_handle: string | null; avatar_url: string | null }
        >(
          ((usersRows ?? []) as unknown as Array<{
            id: string;
            channel_name: string | null;
            channel_handle: string | null;
            avatar_url: string | null;
          }>).map((u) => [
            String(u.id),
            {
              channel_name: u.channel_name,
              channel_handle: u.channel_handle,
              avatar_url: u.avatar_url ?? null,
            },
          ]),
        );

        const scoredVideos = rawVideos.map((v) => {
          const desc = v.description ?? "";
          const tags = v.tags ?? [];
          const userMeta = usersById.get(String(v.user_id));
          const chName = userMeta?.channel_name ?? "";
          const chHandle = userMeta?.channel_handle ?? "";

          const titleScore = matchStrength(q, v.title);
          const descScore = matchStrength(q, desc) * 0.4;
          const tagScore = tags.reduce((acc, tag) => acc + matchStrength(q, String(tag ?? "")) * 0.52, 0);
          const hay = `${v.title} ${desc} ${tags.join(" ")}`;
          const tokenBonus = tokenHitsInText(hay, tokens) * 16;
          const channelBonus =
            Math.max(matchStrength(q, chName), channelHandleBoost(q, chHandle) * 0.48) +
            tokenHitsInText(`${chName} ${chHandle}`, tokens) * 9;

          const base =
            titleScore * 1.12 +
            descScore +
            tagScore +
            tokenBonus +
            channelBonus +
            recencyBoost(v.created_at) +
            viewsSoftBoost(v.views);

          const personalized = (likedIds.has(v.id) ? 90 : 0) + (watchedIds.has(v.id) ? 45 : 0);

          const relevanceScore = base + personalized;
          const createdAtMs = (() => {
            const ms = new Date(v.created_at).getTime();
            return Number.isFinite(ms) ? ms : 0;
          })();
          const viewsNum = typeof v.views === "number" ? v.views : 0;

          v.channel_name = userMeta?.channel_name ?? null;
          v.channel_handle = userMeta?.channel_handle ?? null;
          v.channel_avatar_url = userMeta?.avatar_url ?? null;

          return { v, relevanceScore, createdAtMs, viewsNum };
        });

        const ranked = scoredVideos
          .sort((a, b) => {
            if (sort === "new") {
              if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
              return b.relevanceScore - a.relevanceScore;
            }
            if (sort === "popular") {
              if (b.viewsNum !== a.viewsNum) return b.viewsNum - a.viewsNum;
              return b.relevanceScore - a.relevanceScore;
            }
            return b.relevanceScore - a.relevanceScore;
          })
          .slice(0, 24)
          .map((x) => x.v);

        const { data: channelsRaw } = await supabase
          .from("users")
          .select("id,channel_name,channel_handle,avatar_url,subscribers_count,created_at")
          .or(`channel_name.ilike.%${q}%,channel_handle.ilike.%${q}%`)
          .limit(18);

        const rawChannels = (channelsRaw ?? []) as unknown as ChannelRow[];

        const scoredChannels = rawChannels.map((ch) => {
          const nameScore = matchStrength(q, ch.channel_name);
          const handleScore = channelHandleBoost(q, ch.channel_handle);
          const subs = typeof ch.subscribers_count === "number" ? ch.subscribers_count : 0;
          const subBoost = Math.min(32, Math.round(Math.log10(subs + 10) * 8));
          const tokB = tokenHitsInText(`${ch.channel_name} ${ch.channel_handle ?? ""}`, tokens) * 14;
          const relevanceScore = nameScore * 1.08 + handleScore + subBoost + tokB;
          const createdAtMs = (() => {
            const ms = new Date(ch.created_at ?? "").getTime();
            return Number.isFinite(ms) ? ms : 0;
          })();
          const viewsNum = typeof ch.subscribers_count === "number" ? ch.subscribers_count : 0;
          return { ch, relevanceScore, createdAtMs, viewsNum };
        });

        const sortedChannels = scoredChannels
          .sort((a, b) => {
            if (sort === "new") {
              if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
              return b.relevanceScore - a.relevanceScore;
            }
            if (sort === "popular") {
              if (b.viewsNum !== a.viewsNum) return b.viewsNum - a.viewsNum;
              return b.relevanceScore - a.relevanceScore;
            }
            return b.relevanceScore - a.relevanceScore;
          })
          .slice(0, 18)
          .map((x) => x.ch);

        setVideos(ranked);
        setChannels(sortedChannels);

        const feat = pickFeaturedChannel(q, sortedChannels);
        setFeaturedChannel(feat);

        let subbed = false;
        if (feat && authUser) {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("channel_id")
            .eq("subscriber_id", authUser.id)
            .eq("channel_id", feat.id)
            .maybeSingle();
          subbed = !!subRow;
        }
        setFeaturedSubscribed(subbed);

        if (feat) {
          let vq = supabase
            .from("videos")
            .select("id,title,thumbnail_url,views,created_at,user_id,description,tags,visibility")
            .eq("user_id", feat.id)
            .in("visibility", ["public", "unlisted"]);
          if (sort === "new") {
            vq = vq.order("created_at", { ascending: false });
          } else if (sort === "popular") {
            vq = vq.order("views", { ascending: false });
          } else {
            vq = vq.order("created_at", { ascending: false });
          }
          const { data: chVidRaw } = await vq.limit(24);
          const rows = (chVidRaw ?? []) as VideoRow[];
          for (const v of rows) {
            v.channel_name = feat.channel_name;
            v.channel_handle = feat.channel_handle;
            v.channel_avatar_url = feat.avatar_url;
          }
          setShelfVideos(rows);
        } else {
          setShelfVideos([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [query, isAuthenticated, supabase, sort]);

  const shelfIds = useMemo(() => new Set(shelfVideos.map((v) => v.id)), [shelfVideos]);
  const otherVideos = useMemo(
    () => videos.filter((v) => !shelfIds.has(v.id)),
    [videos, shelfIds],
  );
  const channelsWithoutFeatured = useMemo(
    () => (featuredChannel ? channels.filter((c) => c.id !== featuredChannel.id) : channels),
    [channels, featuredChannel],
  );
  const shelfTeaser = (shelfVideos[0]?.description ?? "").trim() || null;

  const showChannelShelf = kind === "all" && featuredChannel;
  const empty =
    !isLoading &&
    !featuredChannel &&
    videos.length === 0 &&
    shelfVideos.length === 0 &&
    channels.length === 0;

  const goToKind = (nextKind: string) => {
    setIsFilterOpen(false);
    router.push(
      `/search?q=${encodeURIComponent(query)}&kind=${nextKind}&sort=${sort}`,
    );
  };

  const goToSort = (nextSort: string) => {
    setIsFilterOpen(false);
    router.push(
      `/search?q=${encodeURIComponent(query)}&kind=${kind}&sort=${nextSort}`,
    );
  };

  const kindLabel = kind === "videos" ? "Видео" : kind === "channels" ? "Каналы" : "Всё";
  const sortLabel = sort === "new" ? "Новые" : sort === "popular" ? "Популярные" : "Релевантные";

  const filterChip = (active: boolean) =>
    clsx(
      "rounded-full border px-4 py-2 text-sm transition",
      active
        ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-50"
        : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]",
    );

  const channelsToRender = kind === "all" && featuredChannel ? channelsWithoutFeatured : channels;

  const renderVideoCard = (v: VideoRow) => (
    <div
      key={v.id}
      className="group w-full rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
        <Link
          href={`/watch/${v.id}`}
          className="relative w-full shrink-0 overflow-hidden rounded-lg bg-[#0b1323] sm:w-72 md:w-80"
        >
          <div
            className="aspect-video w-full bg-cover bg-center transition group-hover:scale-[1.01]"
            style={v.thumbnail_url ? { backgroundImage: `url(${v.thumbnail_url})` } : undefined}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <Link href={`/watch/${v.id}`} className="block">
                <h4 className="line-clamp-2 text-base font-semibold leading-snug text-slate-100 transition group-hover:text-cyan-200 sm:text-lg">
                  {v.title}
                </h4>
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-slate-500 sm:mt-3 sm:gap-x-3 sm:text-base">
                <ChannelAvatar
                  channelName={v.channel_name?.trim() || v.channel_handle || "Канал"}
                  avatarUrl={v.channel_avatar_url}
                  className="!h-8 !w-8 shrink-0 sm:!h-9 sm:!w-9"
                />
                <span>{(v.views ?? 0).toLocaleString("ru-RU")} просмотров</span>
                {v.channel_name || v.channel_handle ? (
                  <>
                    <span className="text-slate-600" aria-hidden>
                      ·
                    </span>
                    {v.channel_handle ? (
                      <Link
                        href={`/@${v.channel_handle}`}
                        className="text-slate-300 transition hover:text-cyan-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {v.channel_name?.trim() || `@${v.channel_handle}`}
                      </Link>
                    ) : (
                      <span className="text-slate-300">{v.channel_name}</span>
                    )}
                  </>
                ) : null}
              </div>

              <p className="mt-2 line-clamp-3 text-sm text-slate-400 sm:mt-3 sm:line-clamp-2 sm:text-base">
                {v.description && v.description.trim() ? v.description : "Нет описания видео"}
              </p>
            </div>
            <div className="shrink-0 self-end sm:self-start">
              <SearchVideoCardMenu videoId={v.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-8">
      <div
        ref={filterRef}
        className="sticky z-10 border-b border-white/10 bg-[#0a0d14]/95 backdrop-blur-md"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 3rem)" }}
      >
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 md:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setIsFilterOpen((v) => !v)}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
              isFilterOpen
                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-50"
                : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]",
            )}
          >
            <SlidersHorizontal className="h-4 w-4 text-cyan-200" />
            Фильтры
          </button>
          <div className="text-sm text-slate-400">
            {kindLabel} · {sortLabel}
          </div>
        </div>

        {isFilterOpen ? (
          <div className="px-4 pb-4 md:px-6 lg:px-8">
            <div className="rounded-xl border border-white/10 bg-[#0f1628]/95 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
              <div className="mb-3 text-sm font-semibold text-slate-200">Тип</div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => goToKind("all")} className={filterChip(kind === "all")}>
                  Всё
                </button>
                <button type="button" onClick={() => goToKind("videos")} className={filterChip(kind === "videos")}>
                  Видео
                </button>
                <button type="button" onClick={() => goToKind("channels")} className={filterChip(kind === "channels")}>
                  Каналы
                </button>
              </div>

              <div className="mt-4 mb-3 text-sm font-semibold text-slate-200">Сортировка</div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => goToSort("relevance")} className={filterChip(sort === "relevance")}>
                  Релевантные
                </button>
                <button type="button" onClick={() => goToSort("new")} className={filterChip(sort === "new")}>
                  Новые
                </button>
                <button type="button" onClick={() => goToSort("popular")} className={filterChip(sort === "popular")}>
                  Популярные
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <section className="mt-4 space-y-4 px-4 md:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-base text-slate-300">Загрузка...</div>
        ) : empty ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-base text-slate-300">Ничего не найдено.</div>
        ) : null}

        {kind === "all" || kind === "videos" ? (
          showChannelShelf ? (
            <div className="space-y-6">
              <SearchChannelShelf
                channel={{
                  id: featuredChannel!.id,
                  channel_name: featuredChannel!.channel_name,
                  channel_handle: featuredChannel!.channel_handle,
                  avatar_url: featuredChannel!.avatar_url,
                  subscribers_count: featuredChannel!.subscribers_count,
                }}
                viewerId={viewerId}
                initiallySubscribed={featuredSubscribed}
                teaser={shelfTeaser}
              />

              {shelfVideos.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Video className="h-4 w-4 text-cyan-200" />
                    <h3 className="text-base font-semibold text-slate-100">
                      Новые видео на канале {featuredChannel?.channel_name ?? "канал"}
                    </h3>
                  </div>
                  <div className="space-y-4">{shelfVideos.map((v) => renderVideoCard(v))}</div>
                </div>
              ) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">
                  У этого канала пока нет публичных видео.
                </p>
              )}

              {otherVideos.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Video className="h-4 w-4 text-cyan-200" />
                    <h3 className="text-base font-semibold text-slate-100">Другие результаты</h3>
                  </div>
                  <div className="space-y-4">{otherVideos.map((v) => renderVideoCard(v))}</div>
                </div>
              ) : null}
            </div>
          ) : videos.length > 0 ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Video className="h-4 w-4 text-cyan-200" />
                <h3 className="text-base font-semibold text-slate-100">Видео</h3>
              </div>
              <div className="space-y-4">{videos.map((v) => renderVideoCard(v))}</div>
            </div>
          ) : null
        ) : null}

        {kind === "all" || kind === "channels" ? (
          channelsToRender.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-200" />
              <h3 className="text-base font-semibold text-slate-100">Каналы</h3>
            </div>
              <div className="space-y-2">
              {channelsToRender.map((ch) => {
                const active = Boolean(ch.channel_handle && ch.channel_handle.length > 0);
                return (
                  <Link
                    key={ch.id}
                    href={active && ch.channel_handle ? `/@${ch.channel_handle}` : "/"}
                      className={clsx("flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]")}
                  >
                    <ChannelAvatar
                      channelName={ch.channel_name}
                      avatarUrl={ch.avatar_url}
                      className="!h-9 !w-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-medium text-slate-100">{ch.channel_name}</div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                        {ch.channel_handle ? `@${ch.channel_handle}` : ""}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null
        ) : null}
      </section>
    </div>
  );
}

