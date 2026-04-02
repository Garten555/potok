"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search, Video, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthState } from "@/components/auth/auth-context";

type SuggestionVideo = {
  type: "video";
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number | null;
  channel_name: string | null;
  channel_handle: string | null;
  matchScore: number;
};

type SuggestionChannel = {
  type: "channel";
  id: string;
  channel_name: string;
  channel_handle: string | null;
  avatar_url: string | null;
  matchScore: number;
};

type Suggestion = SuggestionVideo | SuggestionChannel;

type VideoRowRaw = {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  views: number | null;
  created_at: string | null;
  user_id: string;
  description: string | null;
  tags: string[] | null;
  visibility: string | null;
};

type UserRowRaw = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
  subscribers_count?: number | null;
};

function tokenize(q: string) {
  return q
    .trim()
    .toLowerCase()
    .split(/[\s]+/g)
    .filter(Boolean)
    .slice(0, 5);
}

function scoreTitle(title: string, q: string) {
  const t = title.toLowerCase();
  const qq = q.toLowerCase();
  if (!qq) return 0;
  if (t === qq) return 120;
  if (t.startsWith(qq)) return 70;
  if (t.includes(qq)) return 35;
  return 0;
}

export type SmartSearchProps = {
  /** compact — строка в шапке; overlay — полноэкранный слой (мобильный) */
  variant?: "compact" | "overlay";
  /** После перехода по результату / Enter */
  onClose?: () => void;
  /** overlay: элемент слева от поля (например стрелка «назад») */
  leading?: ReactNode;
};

export function SmartSearch({ variant = "compact", onClose, leading }: SmartSearchProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthState();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeFetchId = useRef(0);

  const minChars = 2;
  const isOverlay = variant === "overlay";

  useEffect(() => {
    if (isOverlay) return;
    const onPointerDown = (event: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isOverlay]);

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < minChars) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const fetchId = ++activeFetchId.current;
    // Открываем попап сразу, чтобы пользователь видел состояние поиска.
    setIsOpen(true);
    setSuggestions([]);
    setIsLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const tokens = tokenize(q);

        // Персональные бустеры (если есть сессия):
        // - понравившееся (likes.type='like')
        // - недавно просмотренные (watch_history)
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
            likedIds = new Set(
              (likedRows ?? []).map((r) => String((r as { video_id: string }).video_id)),
            );

            const { data: watchedRows } = await supabase
              .from("watch_history")
              .select("video_id")
              .eq("user_id", userData.user.id)
              .order("watched_at", { ascending: false })
              .limit(30);
            watchedIds = new Set(
              (watchedRows ?? []).map((r) => String((r as { video_id: string }).video_id)),
            );
          }
        }

        const likeBoost = (id: string) => (likedIds.has(id) ? 80 : 0);
        const watchBoost = (id: string) => (watchedIds.has(id) ? 40 : 0);

        // Кандидаты по видео: title/description.
        // Ограничиваем выборку и потом ранжируем в JS, чтобы получить “ютуб‑подобное” поведение.
        const { data: videosRaw } = await supabase
          .from("videos")
          .select("id,title,thumbnail_url,views,created_at,user_id,description,tags,visibility")
          .in("visibility", ["public", "unlisted"])
          .ilike("title", `%${q}%`)
          .order("created_at", { ascending: false })
          .limit(12);

        const videos = (videosRaw ?? []) as VideoRowRaw[];

        // Если title не дал — добьем description.
        let videos2: VideoRowRaw[] = [];
        if (videos.length < 6) {
          const { data: videosRaw2 } = await supabase
            .from("videos")
            .select("id,title,thumbnail_url,views,created_at,user_id,description,tags,visibility")
            .in("visibility", ["public", "unlisted"])
            .ilike("description", `%${q}%`)
            .order("created_at", { ascending: false })
            .limit(8);
          videos2 = (videosRaw2 ?? []) as VideoRowRaw[];
        }

        const byId = new Map<string, VideoRowRaw>();
        for (const v of [...videos, ...videos2]) byId.set(String(v.id), v);

        const videoIds = Array.from(byId.keys());
        const { data: users } = videoIds.length
          ? await supabase
              .from("users")
              .select("id,channel_name,channel_handle,avatar_url")
              .in("id", videoIds)
          : { data: [] };

        const usersMap = new Map<string, UserRowRaw>(
          ((users ?? []) as unknown as UserRowRaw[]).map((u) => [String(u.id), u]),
        );

        const scoredVideos: SuggestionVideo[] = Array.from(byId.entries()).map(([id, v]) => {
          const title = String(v.title ?? "");
          const description = String(v.description ?? "");
          const tags = Array.isArray(v.tags) ? (v.tags as string[]) : [];

          const tokenScore =
            tokens.reduce((acc, t) => acc + (title.toLowerCase().includes(t) ? 10 : 0) + (description.toLowerCase().includes(t) ? 4 : 0), 0) ||
            0;

          const tagScore = tags.reduce((acc, tag) => acc + (tag?.toLowerCase().includes(q.toLowerCase()) ? 9 : 0), 0);
          const baseScore = scoreTitle(title, q) + tokenScore + tagScore;

          const channel = usersMap.get(String(v.user_id));

          return {
            type: "video",
            id,
            title,
            thumbnail_url: (v.thumbnail_url as string) ?? null,
            views: (v.views as number) ?? null,
            channel_name: channel?.channel_name ?? null,
            channel_handle: channel?.channel_handle ?? null,
            matchScore: baseScore + likeBoost(String(v.id)) + watchBoost(String(v.id)),
          };
        });

        scoredVideos.sort((a, b) => b.matchScore - a.matchScore);
        const topVideos = scoredVideos.slice(0, 8);

        // Кандидаты по каналам
        const { data: channelsRaw } = await supabase
          .from("users")
          .select("id,channel_name,channel_handle,avatar_url,subscribers_count")
          .or(`channel_name.ilike.%${q}%,channel_handle.ilike.%${q}%`)
          .order("subscribers_count", { ascending: false })
          .limit(6);

        const channels = (channelsRaw ?? []) as UserRowRaw[];
        const scoredChannels: SuggestionChannel[] = channels.map((ch) => ({
          type: "channel",
          id: String(ch.id),
          channel_name: String(ch.channel_name ?? ""),
          channel_handle: (ch.channel_handle as string) ?? null,
          avatar_url: (ch.avatar_url as string) ?? null,
          matchScore: scoreTitle(String(ch.channel_name ?? ""), q),
        }));

        scoredChannels.sort((a, b) => b.matchScore - a.matchScore);

        if (fetchId !== activeFetchId.current) return;
        setSuggestions([...topVideos, ...scoredChannels].slice(0, 10));
        setIsOpen(true);
      } catch {
        if (fetchId !== activeFetchId.current) return;
        setSuggestions([]);
        setIsOpen(true);
      } finally {
        if (fetchId !== activeFetchId.current) return;
        setIsLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query, isAuthenticated, supabase]);

  const submit = (q: string) => {
    const cleaned = q.trim();
    if (!cleaned) return;
    setIsOpen(false);
    onClose?.();
    router.push(`/search?q=${encodeURIComponent(cleaned)}`);
  };

  const onPick = (s: Suggestion) => {
    setIsOpen(false);
    onClose?.();
    if (s.type === "video") {
      router.push(`/watch/${s.id}`);
      return;
    }

    if (s.channel_handle) router.push(`/@${s.channel_handle}`);
    else router.push("/");
  };

  const resultsBody = isLoading ? (
    <div className="px-3 py-6 text-center text-sm text-slate-400">Ищем...</div>
  ) : query.trim().length > 0 && query.trim().length < minChars ? (
    <p className="px-3 py-6 text-center text-sm text-slate-500">Введите ещё {minChars - query.trim().length} символ…</p>
  ) : isOpen && suggestions.length === 0 && query.trim().length >= minChars ? (
    <button
      type="button"
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
      onMouseDown={(e) => {
        e.preventDefault();
        submit(query);
      }}
    >
      Нет подсказок. Искать: <span className="text-cyan-200">{query.trim()}</span>
    </button>
  ) : isOpen && suggestions.length > 0 ? (
    <div className="space-y-1">
      {suggestions.map((s) => {
        if (s.type === "video") {
          return (
            <button
              key={`v-${s.id}`}
              type="button"
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-left transition hover:bg-white/[0.06] active:bg-white/[0.08]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(s)}
            >
              <Video className="h-5 w-5 shrink-0 text-cyan-200/80" />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-medium text-slate-100">{s.title}</div>
                <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{s.channel_name ?? "Канал"}</div>
              </div>
            </button>
          );
        }

        return (
          <button
            key={`c-${s.id}`}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-left transition hover:bg-white/[0.06] active:bg-white/[0.08]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(s)}
          >
            <User className="h-5 w-5 shrink-0 text-cyan-200/80" />
            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 text-sm font-medium text-slate-100">{s.channel_name}</div>
              <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                {s.channel_handle ? `@${s.channel_handle}` : ""}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  ) : (
    <p className="px-3 py-6 text-center text-sm text-slate-500">Начните вводить запрос — покажем видео и каналы.</p>
  );

  return (
    <div
      ref={containerRef}
      className={clsx(
        "min-w-0 w-full",
        isOverlay ? "flex min-h-0 flex-1 flex-col" : "relative max-w-2xl",
      )}
    >
      {isOverlay ? (
        <div className="flex w-full items-center gap-2">
          {leading ? <span className="shrink-0">{leading}</span> : null}
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-400">
            <Search className="h-5 w-5 shrink-0 opacity-70" />
            <input
              className="w-full min-w-0 bg-transparent text-left text-base text-slate-200 outline-none placeholder:text-slate-500"
              placeholder="Поиск по видео и каналам"
              type="search"
              autoFocus={isOverlay}
              autoComplete="off"
              aria-label="Поиск по видео и каналам"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim().length >= minChars) setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit(query);
                if (e.key === "Escape") {
                  setIsOpen(false);
                  onClose?.();
                }
              }}
            />
          </div>
        </div>
      ) : (
        <div
          className={clsx(
            "flex h-9 w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-slate-400",
          )}
        >
          <Search className="h-4 w-4 shrink-0 opacity-70" />
          <input
            className="w-full min-w-0 bg-transparent text-left text-xs text-slate-200 outline-none placeholder:text-slate-500"
            placeholder="Поиск"
            type="search"
            aria-label="Поиск по видео и каналам"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= minChars) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(query);
              if (e.key === "Escape") setIsOpen(false);
            }}
          />
        </div>
      )}

      {isOverlay ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-white/8 bg-[#0c101c]/80 p-2">
            {resultsBody}
          </div>
          <p className="mt-3 px-1 text-center text-[11px] text-slate-500">
            Enter — все результаты на отдельной странице
          </p>
        </div>
      ) : isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1628]/95 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="max-h-[360px] overflow-auto p-2">
            {isLoading ? (
              <div className="px-3 py-2 text-xs text-slate-400">Ищем...</div>
            ) : suggestions.length === 0 && query.trim().length >= minChars ? (
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left text-xs text-slate-200 transition hover:bg-white/[0.06]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  submit(query);
                }}
              >
                Нет результатов. Искать: <span className="text-cyan-200">{query.trim()}</span>
              </button>
            ) : suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((s) => {
                  if (s.type === "video") {
                    return (
                      <button
                        key={`v-${s.id}`}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.06]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPick(s)}
                      >
                        <Video className="h-4 w-4 text-cyan-200/80" />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-xs font-medium text-slate-100">{s.title}</div>
                          <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                            {s.channel_name ?? "Канал"}
                          </div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={`c-${s.id}`}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.06]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onPick(s)}
                    >
                      <User className="h-4 w-4 text-cyan-200/80" />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-xs font-medium text-slate-100">{s.channel_name}</div>
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                          {s.channel_handle ? `@${s.channel_handle}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-3 py-2 text-[11px] text-slate-400">
            Нажмите <span className="text-slate-200">Enter</span> для страницы результатов.
          </div>
        </div>
      ) : null}
    </div>
  );
}

