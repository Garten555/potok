"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Heart, SlidersHorizontal, Video, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthState } from "@/components/auth/auth-context";
import { useRouter, useSearchParams } from "next/navigation";

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

function score(q: string, text: string) {
  const qq = q.trim().toLowerCase();
  if (!qq) return 0;
  const t = (text ?? "").toLowerCase();
  if (!t) return 0;
  if (t === qq) return 120;
  if (t.startsWith(qq)) return 70;
  if (t.includes(qq)) return 35;
  return 0;
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
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setVideos([]);
      setChannels([]);
      return;
    }

    const run = async () => {
      setIsLoading(true);
      try {
        const tokens = q.toLowerCase().split(/[\s]+/g).filter(Boolean).slice(0, 5);

        let likedIds = new Set<string>();
        let watchedIds = new Set<string>();

        if (isAuthenticated) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { data: likedRows } = await supabase
              .from("likes")
              .select("video_id")
              .eq("user_id", userData.user.id)
              .eq("type", "like");
            likedIds = new Set((likedRows ?? []).map((r) => String((r as { video_id: string }).video_id)));

            const { data: watchedRows } = await supabase
              .from("watch_history")
              .select("video_id")
              .eq("user_id", userData.user.id)
              .order("watched_at", { ascending: false })
              .limit(40);
            watchedIds = new Set(
              (watchedRows ?? []).map((r) => String((r as { video_id: string }).video_id)),
            );
          }
        }

        const { data: videosRaw } = await supabase
          .from("videos")
          .select("id,title,thumbnail_url,views,created_at,user_id,description,tags,visibility")
          .in("visibility", ["public", "unlisted"])
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(60);

        const rawVideos = (videosRaw ?? []) as unknown as VideoRow[];

        // Подтягиваем данные канала для отображения рядом с видео.
        const userIds = Array.from(new Set(rawVideos.map((v) => v.user_id)));
        const { data: usersRows } = userIds.length
          ? await supabase.from("users").select("id,channel_name,channel_handle").in("id", userIds)
          : { data: [] };
        const usersById = new Map<string, { channel_name: string | null; channel_handle: string | null }>(
          ((usersRows ?? []) as unknown as Array<{ id: string; channel_name: string | null; channel_handle: string | null }>)
            .map((u) => [String(u.id), { channel_name: u.channel_name, channel_handle: u.channel_handle }]),
        );

        const scoredVideos = rawVideos.map((v) => {
          const desc = v.description ?? "";
          const tags = v.tags ?? [];

          const tokenBoost = tokens.reduce((acc, t) => {
            const inTitle = v.title.toLowerCase().includes(t);
            const inDesc = desc.toLowerCase().includes(t);
            return acc + (inTitle ? 10 : 0) + (inDesc ? 4 : 0);
          }, 0);

          const tagBoost = tags.reduce((acc, t) => acc + (t?.toLowerCase().includes(q.toLowerCase()) ? 9 : 0), 0);
          const base = score(q, v.title) + tokenBoost + tagBoost;

          const personalized = (likedIds.has(v.id) ? 90 : 0) + (watchedIds.has(v.id) ? 45 : 0);

          const relevanceScore = base + personalized;
          const createdAtMs = (() => {
            const ms = new Date(v.created_at).getTime();
            return Number.isFinite(ms) ? ms : 0;
          })();
          const viewsNum = typeof v.views === "number" ? v.views : 0;

          const userMeta = usersById.get(v.user_id);
          v.channel_name = userMeta?.channel_name ?? null;
          v.channel_handle = userMeta?.channel_handle ?? null;

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
          const relevanceScore = score(q, ch.channel_name);
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

        setLikedVideoIds(likedIds);
        setVideos(ranked);
        setChannels(sortedChannels);
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [query, isAuthenticated, supabase, sort]);

  const emptyVideos = (kind === "all" || kind === "videos") && videos.length === 0;
  const emptyChannels = (kind === "all" || kind === "channels") && channels.length === 0;
  const empty = !isLoading && emptyVideos && emptyChannels;

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

  return (
    <div className="pb-8">
      <div
        ref={filterRef}
        className="sticky top-12 z-10 mt-4 border-b border-white/10 bg-[#0a0d14]/80 backdrop-blur-md"
      >
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6 lg:px-8">
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
                <button
                  type="button"
                  onClick={() => goToKind("all")}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-sm transition",
                    kind === "all"
                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-50"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]",
                  )}
                >
                  Всё
                </button>
                <button
                  type="button"
                  onClick={() => goToKind("videos")}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-sm transition",
                    kind === "videos"
                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-50"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]",
                  )}
                >
                  Видео
                </button>
                <button
                  type="button"
                  onClick={() => goToKind("channels")}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-sm transition",
                    kind === "channels"
                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-50"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]",
                  )}
                >
                  Каналы
                </button>
              </div>

              <div className="mt-4 mb-3 text-sm font-semibold text-slate-200">Сортировка</div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goToSort("relevance")}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-sm transition",
                    sort === "relevance"
                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-50"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]",
                  )}
                >
                  Релевантные
                </button>
                <button
                  type="button"
                  onClick={() => goToSort("new")}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-sm transition",
                    sort === "new"
                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-50"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]",
                  )}
                >
                  Новые
                </button>
                <button
                  type="button"
                  onClick={() => goToSort("popular")}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-sm transition",
                    sort === "popular"
                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-50"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]",
                  )}
                >
                  Популярные
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <section className="mt-6 space-y-4 px-4 md:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-base text-slate-300">Загрузка...</div>
        ) : empty ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-base text-slate-300">Ничего не найдено.</div>
        ) : null}

        {kind === "all" || kind === "videos" ? (
          videos.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Video className="h-4 w-4 text-cyan-200" />
              <h3 className="text-base font-semibold text-slate-100">Видео</h3>
            </div>
            {/* YouTube-стиль: превью слева, текст справа (без пустых колонок/мест). */}
            <div className="space-y-4">
              {videos.map((v) => (
                <div
                  key={v.id}
                  className="group w-full rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                >
                  <div className="flex gap-5 p-5">
                    <Link
                      href={`/watch/${v.id}`}
                      className="relative w-80 shrink-0 overflow-hidden rounded-lg bg-[#0b1323]"
                    >
                      <div
                        className="aspect-video w-full bg-cover bg-center transition group-hover:scale-[1.01]"
                        style={v.thumbnail_url ? { backgroundImage: `url(${v.thumbnail_url})` } : undefined}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link href={`/watch/${v.id}`} className="block">
                        <h4 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-100 transition group-hover:text-cyan-200">
                          {v.title}
                        </h4>
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-slate-500">
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

                      <p className="mt-3 line-clamp-2 text-base text-slate-400">
                        {v.description && v.description.trim()
                          ? v.description
                          : "Нет описания видео"}
                      </p>
                    </div>

                    {likedVideoIds.has(v.id) ? (
                      <div className="pt-1 pr-1">
                        <Heart className="h-4 w-4 shrink-0 text-rose-400" />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
        ) : null}

        {kind === "all" || kind === "channels" ? (
          channels.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-200" />
              <h3 className="text-base font-semibold text-slate-100">Каналы</h3>
            </div>
              <div className="space-y-2">
              {channels.map((ch) => {
                const active = Boolean(ch.channel_handle && ch.channel_handle.length > 0);
                  const avatarUrl = ch.avatar_url && ch.avatar_url.trim() ? ch.avatar_url : null;
                  const initial =
                    ch.channel_name?.trim()?.[0]?.toUpperCase() ?? "К";
                return (
                  <Link
                    key={ch.id}
                    href={active && ch.channel_handle ? `/@${ch.channel_handle}` : "/"}
                      className={clsx("flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]")}
                  >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt={ch.channel_name}
                          className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-[#0b1323] object-cover"
                        />
                      ) : (
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#0b1323] text-xs font-semibold text-slate-200">
                          {initial}
                        </div>
                      )}
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

