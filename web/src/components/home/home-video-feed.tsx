"use client";

import { useEffect, useMemo, useState } from "react";
import type { HomeCategoryId } from "@/components/home/categories";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PlayCircle } from "lucide-react";
import { VideoGridCard } from "@/components/video/video-grid-card";
import { scoreVideoForHome, type RecContext } from "@/lib/recommendations";
import { isChannelHiddenFromPublic } from "@/lib/moderation-visibility";

/**
 * Главная: как на YouTube — полоса категорий (слайдер чипов) + один большой блок рекомендаций.
 * Без отдельных секций «тренды / новинки / эфир».
 */
type HomeVideoItem = {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url: string | null;
  views: number;
  created_at: string;
  user_id: string;
  category_id?: string | null;
};

type HomeVideoFeedProps = {
  activeCategory: HomeCategoryId;
};

export function HomeVideoFeed({ activeCategory }: HomeVideoFeedProps) {
  const [videos, setVideos] = useState<HomeVideoItem[]>([]);
  const [likeMap, setLikeMap] = useState<Map<string, number>>(new Map());
  const [recCtx, setRecCtx] = useState<RecContext>({
    now: Date.now(),
    subscribedChannelIds: new Set(),
    likedVideoIds: new Set(),
    watchedVideoIds: new Set(),
  });
  const [authorsMap, setAuthorsMap] = useState<
    Map<string, { channel_name: string; avatar_url: string | null }>
  >(new Map());
  const [categoryById, setCategoryById] = useState<Map<string, string>>(new Map());
  const [now, setNow] = useState(() => Date.now());
  /** Пока первая загрузка списка не завершена — скелетон, а не «нет видео». */
  const [feedReady, setFeedReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
      const supabase = createSupabaseBrowserClient();

      const videosQuery = supabase
        .from("videos")
        .select("id, title, description, thumbnail_url, views, created_at, user_id, category_id, visibility")
        .in("visibility", ["public", "unlisted"])
        .order("created_at", { ascending: false })
        .limit(80);

      const [sessionRes, videosRes, categoriesRes] = await Promise.all([
        supabase.auth.getSession(),
        videosQuery,
        supabase.from("categories").select("id, slug"),
      ]);

      if (cancelled) return;

      setCategoryById(
        new Map(
          (categoriesRes.data ?? []).map((row) => {
            const c = row as { id: string; slug: string };
            return [c.id, c.slug];
          }),
        ),
      );

      let loadedVideos: HomeVideoItem[] = (videosRes.data as HomeVideoItem[]) ?? [];
      const visibilityError = videosRes.error;

      if (
        visibilityError &&
        visibilityError.message.toLowerCase().includes("column") &&
        visibilityError.message.toLowerCase().includes("visibility")
      ) {
        const { data: fallbackVideos } = await supabase
          .from("videos")
          .select("id, title, description, thumbnail_url, views, created_at, user_id, category_id")
          .order("created_at", { ascending: false })
          .limit(80);
        if (cancelled) return;
        loadedVideos = (fallbackVideos as HomeVideoItem[]) ?? [];
      }

      const authorIds = Array.from(new Set(loadedVideos.map((v) => v.user_id).filter(Boolean)));
      if (authorIds.length > 0) {
        try {
          const { data: authorPenaltyRows, error: penErr } = await supabase
            .from("users")
            .select("id, account_frozen_at, moderation_soft_freeze_at, moderation_hard_freeze_until")
            .in("id", authorIds);
          if (!penErr && authorPenaltyRows) {
            const hidden = new Set<string>();
            for (const row of authorPenaltyRows as Array<{
              id: string;
              account_frozen_at?: string | null;
              moderation_soft_freeze_at?: string | null;
              moderation_hard_freeze_until?: string | null;
            }>) {
              if (isChannelHiddenFromPublic(row)) hidden.add(String(row.id));
            }
            if (hidden.size > 0) {
              loadedVideos = loadedVideos.filter((v) => !hidden.has(v.user_id));
            }
          }
        } catch {
          /* миграция без колонок — пропускаем фильтр */
        }
      }

      if (cancelled) return;
      setVideos(loadedVideos);
      setFeedReady(true);

      const user = sessionRes.data.session?.user ?? null;
      const vids = loadedVideos.map((v) => v.id);
      const userIds = Array.from(new Set(loadedVideos.map((video) => video.user_id).filter(Boolean)));

      const prefsPromise =
        user != null
          ? Promise.all([
              supabase.from("subscriptions").select("channel_id").eq("subscriber_id", user.id),
              supabase.from("likes").select("video_id").eq("user_id", user.id).eq("type", "like"),
              supabase
                .from("watch_history")
                .select("video_id")
                .eq("user_id", user.id)
                .order("watched_at", { ascending: false })
                .limit(80),
            ])
          : Promise.resolve(null);

      const [prefs, likeAgg, authorsRes] = await Promise.all([
        prefsPromise,
        vids.length > 0
          ? supabase.from("likes").select("video_id").eq("type", "like").in("video_id", vids)
          : Promise.resolve({ data: null as { video_id: string }[] | null }),
        userIds.length > 0
          ? supabase.from("users").select("id, channel_name, avatar_url").in("id", userIds)
          : Promise.resolve({ data: null as { id: string; channel_name: string | null; avatar_url: string | null }[] | null }),
      ]);

      if (cancelled) return;

      let subscribedChannelIds = new Set<string>();
      let likedVideoIds = new Set<string>();
      let watchedVideoIds = new Set<string>();
      if (prefs) {
        const [subs, lk, wh] = prefs;
        subscribedChannelIds = new Set(
          (subs.data ?? []).map((s) => String((s as { channel_id: string }).channel_id)),
        );
        likedVideoIds = new Set((lk.data ?? []).map((l) => String((l as { video_id: string }).video_id)));
        watchedVideoIds = new Set((wh.data ?? []).map((w) => String((w as { video_id: string }).video_id)));
      }

      setRecCtx({
        now: Date.now(),
        subscribedChannelIds,
        likedVideoIds,
        watchedVideoIds,
      });

      const nextLikeMap = new Map<string, number>();
      for (const row of likeAgg.data ?? []) {
        const id = String((row as { video_id: string }).video_id);
        nextLikeMap.set(id, (nextLikeMap.get(id) ?? 0) + 1);
      }
      setLikeMap(nextLikeMap);

      if (authorsRes.data && authorsRes.data.length > 0) {
        setAuthorsMap(
          new Map(
            authorsRes.data.map((a) => {
              const row = a as { id: string; channel_name: string | null; avatar_url: string | null };
              return [
                String(row.id),
                { channel_name: row.channel_name ?? "Канал", avatar_url: row.avatar_url ?? null },
              ];
            }),
          ),
        );
      }
      } catch {
        if (!cancelled) setFeedReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Чтобы соблюсти чистоту рендера (eslint react-hooks/purity), обновляем время через state.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const filteredVideos = useMemo(() => {
    const ctx: RecContext = { ...recCtx, now };
    let pool = videos;
    if (activeCategory === "recent") pool = videos.slice(0, 24);
    else if (activeCategory === "podcasts") {
      pool = videos.filter((video) => {
        const text = `${video.title} ${video.description ?? ""}`.toLowerCase();
        return text.includes("podcast") || text.includes("подкаст");
      });
    } else if (activeCategory !== "all") {
      pool = videos.filter((video) => categoryById.get(video.category_id ?? "") === activeCategory);
    }

    const scored = pool.map((v) => ({
      v,
      s: scoreVideoForHome({ ...v, like_count: likeMap.get(v.id) ?? 0 }, ctx),
    }));
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.v);
  }, [activeCategory, videos, categoryById, now, likeMap, recCtx]);

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden pb-[max(2rem,env(safe-area-inset-bottom))]">
      <section className="mx-auto w-full min-w-0 max-w-[1920px] space-y-3 px-3 pt-2 sm:px-4 md:px-5 lg:px-6">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-100">
          <PlayCircle className="h-4 w-4 text-cyan-200" />
          Рекомендации
        </h2>
        {!feedReady ? (
          <div
            className={
              "grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-x-4 " +
              "lg:grid-cols-3 xl:grid-cols-4"
            }
            aria-busy
            aria-label="Загрузка рекомендаций"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="min-w-0 space-y-2">
                <div className="aspect-video w-full animate-pulse rounded-xl bg-white/[0.08]" />
                <div className="h-4 w-[88%] animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-[55%] animate-pulse rounded bg-white/[0.05]" />
              </div>
            ))}
          </div>
        ) : filteredVideos.length > 0 ? (
          <div
            className={
              "grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-x-4 " +
              "lg:grid-cols-3 xl:grid-cols-4"
            }
          >
            {filteredVideos.map((video) => {
              const meta = video.user_id ? authorsMap.get(String(video.user_id)) : undefined;
              const authorName = meta?.channel_name ?? "Канал";
              return (
                <VideoGridCard
                  key={video.id}
                  layout="home"
                  videoId={video.id}
                  title={video.title}
                  thumbnailUrl={video.thumbnail_url}
                  views={video.views}
                  createdAt={video.created_at}
                  channelName={authorName}
                  avatarUrl={meta?.avatar_url ?? null}
                  nowMs={now}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            По этой категории пока нет видео.
          </div>
        )}
      </section>
    </div>
  );
}
