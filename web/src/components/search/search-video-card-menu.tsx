"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListVideo, MoreVertical, Clock } from "lucide-react";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SearchVideoCardMenuProps = {
  videoId: string;
};

/**
 * Меню «⋯» у карточки видео в поиске: смотреть позже, добавить в плейлист.
 */
export function SearchVideoCardMenu({ videoId }: SearchVideoCardMenuProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setPlaylists([]);
        return;
      }
      const { data } = await supabase
        .from("playlists")
        .select("id, title")
        .eq("user_id", u.user.id)
        .is("system_key", null)
        .order("created_at", { ascending: false })
        .limit(30);
      setPlaylists(((data ?? []) as { id: string; title: string }[]) ?? []);
    })();
  }, [open, supabase]);

  const nextPosition = async (playlistId: string) => {
    const { data: last } = await supabase
      .from("playlist_videos")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    return ((last as { position?: number } | null)?.position ?? 0) + 1;
  };

  const addWatchLater = async () => {
    setMsg(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = "/auth";
      return;
    }
    setBusy(true);
    try {
      const { data: wl } = await supabase
        .from("playlists")
        .select("id")
        .eq("user_id", auth.user.id)
        .eq("system_key", "watch_later")
        .maybeSingle();
      const pid = (wl as { id?: string } | null)?.id;
      if (!pid) {
        setMsg("Не найден плейлист «Смотреть позже».");
        return;
      }
      const { data: exists } = await supabase
        .from("playlist_videos")
        .select("video_id")
        .eq("playlist_id", pid)
        .eq("video_id", videoId)
        .maybeSingle();
      if (exists) {
        setMsg("Уже в «Смотреть позже».");
        setOpen(false);
        return;
      }
      const pos = await nextPosition(pid);
      const { error } = await supabase.from("playlist_videos").insert({
        playlist_id: pid,
        video_id: videoId,
        position: pos,
      });
      if (error) {
        setMsg("Не удалось добавить.");
        return;
      }
      setMsg("Добавлено в «Смотреть позже».");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const addToPlaylist = async (playlistId: string) => {
    setMsg(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = "/auth";
      return;
    }
    setBusy(true);
    try {
      const { data: exists } = await supabase
        .from("playlist_videos")
        .select("video_id")
        .eq("playlist_id", playlistId)
        .eq("video_id", videoId)
        .maybeSingle();
      if (exists) {
        setMsg("Уже в этом плейлисте.");
        return;
      }
      const pos = await nextPosition(playlistId);
      const { error } = await supabase.from("playlist_videos").insert({
        playlist_id: playlistId,
        video_id: videoId,
        position: pos,
      });
      if (error) {
        setMsg(
          error.message?.includes("owner") || error.message?.includes("channel")
            ? "В плейлист канала — только свои видео."
            : "Не удалось добавить в плейлист.",
        );
        return;
      }
      setMsg("Видео добавлено в плейлист.");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0 self-start pt-1" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-slate-100"
        title="Действия"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 min-w-[14rem] overflow-hidden rounded-xl border border-white/10 bg-[#0f1628]/98 py-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => void addWatchLater()}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/[0.08]"
          >
            <Clock className="h-4 w-4 shrink-0 text-cyan-200" />
            Смотреть позже
          </button>
          <div className="border-t border-white/10 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Плейлист
          </div>
          {playlists.length === 0 ? (
            <div className="px-3 pb-2 text-xs text-slate-500">Нет плейлистов. Создайте в Студии.</div>
          ) : (
            <div className="max-h-48 overflow-y-auto py-0.5">
              {playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => void addToPlaylist(p.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.08]"
                >
                  <ListVideo className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{p.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {msg ? <p className={clsx("absolute right-0 top-full z-40 mt-1 max-w-[14rem] text-xs", msg.startsWith("Доб") ? "text-emerald-300" : "text-rose-300")}>{msg}</p> : null}
    </div>
  );
}
