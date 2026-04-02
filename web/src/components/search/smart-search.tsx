"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search, Video, History } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthState } from "@/components/auth/auth-context";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { clearSearchHistory, getSearchHistory, pushSearchHistory } from "@/lib/search-history";

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
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeFetchId = useRef(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minChars = 2;
  const isOverlay = variant === "overlay";

  const refreshHistory = () => setSearchHistory(getSearchHistory());

  const handleInputFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setFocused(true);
    refreshHistory();
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    blurTimerRef.current = setTimeout(() => setFocused(false), 160);
  };

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
      setIsLoading(false);
      return;
    }

    const fetchId = ++activeFetchId.current;
    setIsOpen(true);
    setSuggestions([]);
    setIsLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const tokens = tokenize(q);

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

        const { data: videosRaw } = await supabase
          .from("videos")
          .select("id,title,thumbnail_url,views,created_at,user_id,description,tags,visibility")
          .in("visibility", ["public", "unlisted"])
          .ilike("title", `%${q}%`)
          .order("created_at", { ascending: false })
          .limit(12);

        const videos = (videosRaw ?? []) as VideoRowRaw[];

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
    pushSearchHistory(cleaned);
    refreshHistory();
    setIsOpen(false);
    onClose?.();
    router.push(`/search?q=${encodeURIComponent(cleaned)}`);
  };

  const onPick = (s: Suggestion) => {
    const typed = query.trim();
    if (typed.length >= 2) pushSearchHistory(typed);
    refreshHistory();
    setIsOpen(false);
    onClose?.();
    if (s.type === "video") {
      router.push(`/watch/${s.id}`);
      return;
    }

    if (s.channel_handle) router.push(`/@${s.channel_handle}`);
    else router.push("/");
  };

  const trimmed = query.trim();
  const showHistoryPanel = focused && trimmed.length < minChars && searchHistory.length > 0;
  const showShortHint = focused && trimmed.length > 0 && trimmed.length < minChars;
  const showEmptyHint = focused && trimmed.length === 0 && searchHistory.length === 0;

  const historySection = (compact: boolean) => (
    <div className="space-y-2">
      <div className={clsx("flex items-center justify-between", compact ? "px-1 pt-0.5" : "px-2 pt-1")}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Недавние</span>
        <button
          type="button"
          className="text-[11px] text-cyan-300/90 transition hover:underline"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            clearSearchHistory();
            setSearchHistory([]);
          }}
        >
          Очистить
        </button>
      </div>
      <div className="space-y-1">
        {searchHistory.map((h) => (
          <button
            key={h}
            type="button"
            className={clsx(
              "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-left transition hover:bg-white/[0.06] active:bg-white/[0.08]",
              compact ? "px-3 py-2" : "gap-3 px-3 py-3",
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => submit(h)}
          >
            <History className={clsx("shrink-0 text-slate-500", compact ? "h-4 w-4" : "h-5 w-5")} />
            <span className={clsx("min-w-0 truncate text-slate-200", compact ? "text-xs" : "text-sm")}>{h}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const channelRow = (s: SuggestionChannel, compact: boolean, onActivate: () => void) => (
    <button
      key={`c-${s.id}`}
      type="button"
      className={clsx(
        "flex w-full items-center rounded-xl border border-white/10 bg-white/[0.02] text-left transition hover:bg-white/[0.06] active:bg-white/[0.08]",
        compact ? "gap-2 px-3 py-2" : "gap-3 px-3 py-3",
      )}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onActivate}
    >
      <ChannelAvatar
        channelName={s.channel_name}
        avatarUrl={s.avatar_url}
        variant="video"
        className={compact ? "!h-8 !w-8 !min-h-0 !min-w-0 !text-[11px] sm:!h-8 sm:!w-8" : "!h-10 !w-10 !text-sm sm:!h-10 sm:!w-10"}
      />
      <div className="min-w-0 flex-1">
        <div className={clsx("line-clamp-1 font-medium text-slate-100", compact ? "text-xs" : "text-sm")}>
          {s.channel_name}
        </div>
        <div className={clsx("line-clamp-1 text-slate-400", compact ? "text-[11px]" : "text-xs")}>
          {s.channel_handle ? `@${s.channel_handle}` : ""}
        </div>
      </div>
    </button>
  );

  const suggestionsList = (compact: boolean) => (
    <div className="space-y-1">
      {suggestions.map((s) => {
        if (s.type === "video") {
          return (
            <button
              key={`v-${s.id}`}
              type="button"
              className={clsx(
                "flex w-full items-center rounded-xl border border-white/10 bg-white/[0.02] text-left transition hover:bg-white/[0.06] active:bg-white/[0.08]",
                compact ? "gap-2 px-3 py-2" : "gap-3 px-3 py-3",
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(s)}
            >
              <Video className={clsx("shrink-0 text-cyan-200/80", compact ? "h-4 w-4" : "h-5 w-5")} />
              <div className="min-w-0 flex-1">
                <div className={clsx("line-clamp-2 font-medium text-slate-100", compact ? "line-clamp-1 text-xs" : "text-sm")}>
                  {s.title}
                </div>
                <div className={clsx("line-clamp-1 text-slate-400", compact ? "text-[11px]" : "text-xs")}>
                  {s.channel_name ?? "Канал"}
                </div>
              </div>
            </button>
          );
        }
        return channelRow(s, compact, () => onPick(s));
      })}
    </div>
  );

  const resultsBody = isLoading && trimmed.length >= minChars ? (
    <div className="px-3 py-6 text-center text-sm text-slate-400">Ищем...</div>
  ) : showHistoryPanel ? (
    historySection(false)
  ) : showShortHint ? (
    <p className="px-3 py-6 text-center text-sm text-slate-500">
      Введите ещё {minChars - trimmed.length} символ…
    </p>
  ) : showEmptyHint ? (
    <p className="px-3 py-6 text-center text-sm text-slate-500">
      Недавние запросы появятся после поиска. Начните вводить — покажем видео и каналы.
    </p>
  ) : trimmed.length >= minChars && !isLoading && suggestions.length === 0 ? (
    <button
      type="button"
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
      onMouseDown={(e) => {
        e.preventDefault();
        submit(query);
      }}
    >
      Нет подсказок. Искать: <span className="text-cyan-200">{trimmed}</span>
    </button>
  ) : suggestions.length > 0 ? (
    suggestionsList(false)
  ) : (
    <p className="px-3 py-6 text-center text-sm text-slate-500">Начните вводить запрос — покажем видео и каналы.</p>
  );

  const compactDropdownInner = () => {
    if (isLoading && trimmed.length >= minChars) {
      return <div className="px-3 py-2 text-xs text-slate-400">Ищем...</div>;
    }
    if (showHistoryPanel) return <div className="p-1">{historySection(true)}</div>;
    if (showShortHint) {
      return (
        <div className="px-3 py-4 text-center text-xs text-slate-500">
          Введите ещё {minChars - trimmed.length} символ…
        </div>
      );
    }
    if (showEmptyHint) {
      return (
        <div className="px-3 py-4 text-center text-xs text-slate-500">
          Недавние запросы сохраняются здесь. Введите запрос из 2+ символов.
        </div>
      );
    }
    if (trimmed.length >= minChars && !isLoading && suggestions.length === 0) {
      return (
        <button
          type="button"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left text-xs text-slate-200 transition hover:bg-white/[0.06]"
          onMouseDown={(e) => {
            e.preventDefault();
            submit(query);
          }}
        >
          Нет результатов. Искать: <span className="text-cyan-200">{trimmed}</span>
        </button>
      );
    }
    if (suggestions.length > 0) return <div className="space-y-1 p-1">{suggestionsList(true)}</div>;
    return null;
  };

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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
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
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
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
          <div className="max-h-[360px] overflow-auto p-2">{compactDropdownInner()}</div>

          <div className="border-t border-white/10 px-3 py-2 text-[11px] text-slate-400">
            Нажмите <span className="text-slate-200">Enter</span> для страницы результатов.
          </div>
        </div>
      ) : null}
    </div>
  );
}
