"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ListVideo } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthState } from "@/components/auth/auth-context";
import { YoutubeStylePlaylistThumbnail } from "@/components/playlist/youtube-style-playlist-thumbnail";
import { studioPathForNav } from "@/lib/studio-view-param";

type PlaylistRow = {
  id: string;
  title: string;
  description: string | null;
  system_key: string | null;
  is_system: boolean;
  visibility: string;
  created_at: string;
};

type PvRow = {
  playlist_id: string;
  position: number;
  video_id: string;
  videos: { thumbnail_url: string | null } | { thumbnail_url: string | null }[] | null;
};

function playlistDisplayTitle(pl: PlaylistRow): string {
  if (pl.system_key === "watch_later") return "Смотреть позже";
  return pl.title;
}

export function PlaylistsPageFeed() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { isAuthenticated } = useAuthState();
  const [rows, setRows] = useState<
    Array<{
      pl: PlaylistRow;
      count: number;
      thumb: string | null;
      firstVideoId: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setRows([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        const user = u.user;
        if (!user) {
          setRows([]);
          return;
        }

        const { data: plData } = await supabase
          .from("playlists")
          .select("id, title, description, system_key, is_system, visibility, created_at")
          .eq("user_id", user.id)
          .eq("kind", "user")
          .order("created_at", { ascending: false });

        const playlists = (plData ?? []) as PlaylistRow[];
        if (playlists.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const ids = playlists.map((p) => p.id);
        const { data: pvData } = await supabase
          .from("playlist_videos")
          .select("playlist_id, position, video_id, videos(thumbnail_url)")
          .in("playlist_id", ids)
          .order("position", { ascending: true });

        const pvRows = (pvData ?? []) as PvRow[];
        const countBy = new Map<string, number>();
        const firstThumb = new Map<string, string | null>();
        const firstVid = new Map<string, string>();

        for (const r of pvRows) {
          const pid = String(r.playlist_id);
          countBy.set(pid, (countBy.get(pid) ?? 0) + 1);
          if (!firstVid.has(pid)) {
            firstVid.set(pid, String(r.video_id));
            const v = r.videos;
            const thumb = Array.isArray(v) ? v[0]?.thumbnail_url ?? null : v?.thumbnail_url ?? null;
            firstThumb.set(pid, thumb);
          }
        }

        const sorted = [...playlists].sort((a, b) => {
          const aw = a.system_key === "watch_later" ? 0 : 1;
          const bw = b.system_key === "watch_later" ? 0 : 1;
          if (aw !== bw) return aw - bw;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        if (cancelled) return;
        setRows(
          sorted.map((pl) => ({
            pl,
            count: countBy.get(pl.id) ?? 0,
            thumb: firstThumb.get(pl.id) ?? null,
            firstVideoId: firstVid.get(pl.id) ?? null,
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, supabase]);

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 md:px-6 lg:px-8">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-100">
          <ListVideo className="h-4 w-4 text-cyan-200" />
          Плейлисты
        </h2>
        <p className="mt-1 text-sm text-slate-400">Все ваши плейлисты, включая «Смотреть позже»</p>
      </div>

      {!isAuthenticated ? (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            Войдите, чтобы видеть свои плейлисты.
          </div>
        </section>
      ) : loading ? (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">Загрузка...</div>
        </section>
      ) : rows.length === 0 ? (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            Плейлистов пока нет. Создайте свои в{" "}
            <Link href={studioPathForNav("playlists")} className="text-cyan-200 underline hover:text-cyan-100">
              студии
            </Link>
            .
          </div>
        </section>
      ) : (
        <section className="mt-6 px-4 md:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map(({ pl, count, thumb, firstVideoId }) => {
              const title = playlistDisplayTitle(pl);
              const href =
                firstVideoId != null
                  ? `/watch/${firstVideoId}?list=${encodeURIComponent(pl.id)}`
                  : studioPathForNav("playlists");
              const visibilityLabel =
                pl.visibility === "private"
                  ? "Приватный"
                  : pl.visibility === "unlisted"
                    ? "Доступ по ссылке"
                    : null;
              const metaLine =
                count === 0
                  ? ["Нет видео", visibilityLabel, "Добавьте ролики в студии"].filter(Boolean).join(" · ")
                  : (visibilityLabel ?? "");

              return (
                <Link
                  key={pl.id}
                  href={href}
                  className="group block rounded-xl p-1.5 transition hover:bg-white/[0.04]"
                  aria-label={`Плейлист: ${title}`}
                >
                  <YoutubeStylePlaylistThumbnail
                    thumbnailUrl={thumb}
                    videosCount={count}
                    title={title}
                  />
                  <div className="mt-2.5 min-w-0 px-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Плейлист</p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-100 transition group-hover:text-cyan-200 sm:text-[15px]">
                      {title}
                    </p>
                    {metaLine ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{metaLine}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
