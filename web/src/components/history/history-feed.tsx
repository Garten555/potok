"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Trash2, Clock } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fuzzyFilterEntities } from "@/lib/fuzzy-text-search";
import { useAuthState } from "@/components/auth/auth-context";
import { ChannelAvatar } from "@/components/channel/channel-avatar";

type HistoryRow = {
  video_id: string;
  watched_at: string;
};

type VideoRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number | null;
  created_at: string | null;
  user_id: string;
  description: string | null;
  visibility: string;
  tags?: string[] | null;
};

type UserRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
};

export function HistoryFeed() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { isAuthenticated } = useAuthState();

  const [items, setItems] = useState<Array<{ video: VideoRow; watchedAt: string }>>([]);
  const [authors, setAuthors] = useState<Map<string, UserRow>>(new Map());

  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [q, setQ] = useState("");

  const load = async () => {
    const qUser = await supabase.auth.getUser();
    const user = qUser.data.user;

    if (!user) {
      setItems([]);
      setAuthors(new Map());
      return;
    }

    setIsLoading(true);
    try {
      const { data: historyRows } = await supabase
        .from("watch_history")
        .select("video_id,watched_at")
        .eq("user_id", user.id)
        .order("watched_at", { ascending: false })
        .limit(80);

      const rows = (historyRows ?? []) as HistoryRow[];
      const videoIds = Array.from(new Set(rows.map((r) => String(r.video_id))));

      if (videoIds.length === 0) {
        setItems([]);
        setAuthors(new Map());
        return;
      }

      const { data: videosRaw } = await supabase
        .from("videos")
        .select("id,title,thumbnail_url,views,created_at,user_id,description,visibility")
        .in("id", videoIds);

      const videos = (videosRaw ?? []) as VideoRow[];

      const watchedAtById = new Map<string, string>();
      for (const r of rows) watchedAtById.set(String(r.video_id), String(r.watched_at));

      const merged = videos
        .map((v) => ({
          video: v,
          watchedAt: watchedAtById.get(String(v.id)) ?? v.created_at ?? new Date().toISOString(),
        }))
        .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());

      const authorIds = Array.from(new Set(merged.map((m) => m.video.user_id)));
      const { data: usersRaw } = authorIds.length
        ? await supabase
            .from("users")
            .select("id,channel_name,channel_handle,avatar_url")
            .in("id", authorIds)
        : { data: [] };

      const userRows = (usersRaw ?? []) as UserRow[];
      /* String(id) — как и video.user_id, чтобы Map.get не промахивался из‑за типа ключа */
      setAuthors(new Map(userRows.map((u) => [String(u.id), u])));
      setItems(merged);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setAuthors(new Map());
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const filteredItems = useMemo(() => {
    return fuzzyFilterEntities(
      items,
      (it) => it.video.id,
      (it) => {
        const author = authors.get(String(it.video.user_id));
        const tags = ((it.video.tags ?? []) as string[]).join(" ");
        return [
          it.video.title,
          it.video.description ?? "",
          tags,
          author?.channel_name ?? "",
          author?.channel_handle ?? "",
          author?.channel_handle ? `@${author.channel_handle}` : "",
        ];
      },
      q,
    );
  }, [items, q, authors]);

  const clearHistory = async () => {
    const qUser = await supabase.auth.getUser();
    const user = qUser.data.user;
    if (!user) return;
    if (!window.confirm("Очистить всю историю просмотров на этом устройстве аккаунта?")) return;

    setIsClearing(true);
    setClearError("");
    try {
      const { error } = await supabase.from("watch_history").delete().eq("user_id", user.id);
      if (error) {
        setClearError(error.message || "Не удалось очистить историю.");
        return;
      }
      setItems([]);
      setAuthors(new Map());
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 md:px-6 lg:px-8">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-100">
          <Clock className="h-4 w-4 text-cyan-200" />
          История
        </h2>
      </div>

      {!isAuthenticated ? (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            Войдите, чтобы видеть историю просмотров.
          </div>
        </section>
      ) : (
        <section className="mt-4 space-y-4 px-4 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-400">
              Последние просмотренные видео
              {q.trim() ? (
                <>
                  {" "}
                  · показано {filteredItems.length} из {items.length}
                </>
              ) : null}
            </div>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={() => void clearHistory()}
                disabled={isClearing}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                  "border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20",
                  isClearing ? "cursor-not-allowed opacity-60" : null,
                )}
              >
                <Trash2 className="h-4 w-4" />
                {isClearing ? "Очистка..." : "Очистить историю"}
              </button>
            ) : null}
          </div>

          {clearError ? (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{clearError}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск: название, описание, канал, теги (с опечатками)"
              className="w-full rounded-xl border border-white/10 bg-[#0b1120] px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
            />
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">Загрузка...</div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
              {q.trim() ? (
                <>
                  Ничего не найдено (поиск учитывает опечатки). Сократите запрос или сбросьте поле поиска.
                </>
              ) : (
                <>История просмотров пуста.</>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(({ video, watchedAt }) => {
                const author = authors.get(String(video.user_id));
                const channelLabel = author?.channel_name?.trim() || "Канал";

                return (
                  <Link
                    key={video.id}
                    href={`/watch/${video.id}`}
                    className="group block w-full rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="relative w-80 shrink-0 overflow-hidden rounded-lg bg-[#0b1323]">
                        <div
                          className="aspect-video w-full bg-cover bg-center"
                          style={video.thumbnail_url ? { backgroundImage: `url(${video.thumbnail_url})` } : undefined}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <ChannelAvatar
                            channelName={channelLabel}
                            avatarUrl={author?.avatar_url}
                            className="mt-1 !h-10 !w-10 !text-xs shrink-0"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <h3 className="line-clamp-2 font-semibold text-slate-100 transition group-hover:text-cyan-200">
                                {video.title}
                              </h3>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {(video.views ?? 0).toLocaleString("ru-RU")} просмотров
                              {" · "}
                              {new Date(watchedAt).toLocaleString("ru-RU")}
                            </div>
                            <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                              {author?.channel_name ?? "Канал"}
                              {author?.channel_handle ? ` · @${author.channel_handle}` : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

