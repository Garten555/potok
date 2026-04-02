"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Clock, ThumbsUp, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthState } from "@/components/auth/auth-context";

type LikeRow = {
  video_id: string;
  created_at: string;
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
};

type UserRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
};

export function LikedFeed() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { isAuthenticated } = useAuthState();

  const [items, setItems] = useState<Array<{ video: VideoRow; likedAt: string }>>([]);
  const [authors, setAuthors] = useState<Map<string, UserRow>>(new Map());

  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
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
      const { data: likeRows } = await supabase
        .from("likes")
        .select("video_id,created_at")
        .eq("user_id", user.id)
        .eq("type", "like")
        .order("created_at", { ascending: false })
        .limit(80);

      const rows = (likeRows ?? []) as LikeRow[];
      const videoIds = Array.from(new Set(rows.map((r) => String(r.video_id))));
      if (videoIds.length === 0) {
        setItems([]);
        setAuthors(new Map());
        return;
      }

      const { data: videosRaw } = await supabase
        .from("videos")
        .select("id,title,thumbnail_url,views,created_at,user_id,description,visibility")
        .in("id", videoIds)
        .order("created_at", { ascending: false });

      const videos = (videosRaw ?? []) as VideoRow[];

      const likedAtById = new Map<string, string>();
      for (const r of rows) likedAtById.set(String(r.video_id), String(r.created_at));

      const merged = videos
        .map((v) => ({
          video: v,
          likedAt: likedAtById.get(String(v.id)) ?? v.created_at ?? new Date().toISOString(),
        }))
        .sort((a, b) => new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime());

      const authorIds = Array.from(new Set(merged.map((m) => m.video.user_id)));
      const { data: usersRaw } = authorIds.length
        ? await supabase
            .from("users")
            .select("id,channel_name,channel_handle,avatar_url")
            .in("id", authorIds)
        : { data: [] };

      const userRows = (usersRaw ?? []) as UserRow[];
      setAuthors(new Map(userRows.map((u) => [u.id, u])));
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

  const clearLikes = async () => {
    const qUser = await supabase.auth.getUser();
    const user = qUser.data.user;
    if (!user) return;

    setIsClearing(true);
    try {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("type", "like");
      setItems([]);
      setAuthors(new Map());
    } finally {
      setIsClearing(false);
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => it.video.title.toLowerCase().includes(qq));
  }, [items, q]);

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 md:px-6 lg:px-8">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-100">
          <ThumbsUp className="h-4 w-4 text-cyan-200" />
          Понравившиеся
        </h2>
      </div>

      {!isAuthenticated ? (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            Войдите, чтобы видеть понравившиеся видео.
          </div>
        </section>
      ) : (
        <section className="mt-4 space-y-4 px-4 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-cyan-200" />
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={clearLikes}
                  disabled={isClearing}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                    "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]",
                    isClearing ? "opacity-60 cursor-not-allowed" : null,
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  {isClearing ? "Очистка..." : "Убрать все"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по понравившимся"
              className="w-full rounded-xl border border-white/10 bg-[#0b1120] px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
            />
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
              Загрузка...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
              Понравившихся видео нет.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(({ video, likedAt }) => {
                const author = authors.get(video.user_id);
                const avatarUrl = author?.avatar_url && author.avatar_url.trim() ? author.avatar_url : null;
                const initial = author?.channel_name?.trim()?.[0]?.toUpperCase() ?? "К";

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
                          <div className="mt-1 h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#0b1323]">
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={avatarUrl}
                                alt={author?.channel_name ?? "Канал"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs font-semibold text-slate-200">
                                {initial}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <h3 className="line-clamp-2 text-base font-semibold text-slate-100 transition group-hover:text-cyan-200">
                                {video.title}
                              </h3>
                              <ThumbsUp className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {(video.views ?? 0).toLocaleString("ru-RU")} просмотров ·{" "}
                              <Clock className="inline h-3.5 w-3.5" />{" "}
                              {new Date(likedAt).toLocaleString("ru-RU")}
                            </div>
                            <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                              {author?.channel_name ?? "Канал"}
                              {author?.channel_handle ? ` · @${author.channel_handle}` : ""}
                            </div>
                            <div className="mt-2 line-clamp-2 text-sm text-slate-300">
                              {video.description && video.description.trim() ? video.description : "Нет описания видео"}
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

