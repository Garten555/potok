"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookmarkPlus, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { ReportDialog } from "@/components/report/report-dialog";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPusherClient } from "@/lib/pusher/client";
import { triggerPusherEvent } from "@/lib/pusher/trigger";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

type Visibility = "public" | "unlisted" | "private";
type PlaylistKind = "user" | "channel";

type PlaylistItem = {
  id: string;
  title: string;
  visibility: Visibility;
  is_system?: boolean;
};

type WatchActionsProps = {
  videoId: string;
  /** С сервера: автор ролика не видит «Жалоба» с первого кадра (без мигания). */
  initialVideoOwner?: boolean;
};

export function WatchActions({ videoId, initialVideoOwner = false }: WatchActionsProps) {
  const [isAuth, setIsAuth] = useState(false);
  const [isVideoOwner, setIsVideoOwner] = useState(initialVideoOwner);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [myReaction, setMyReaction] = useState<"like" | "dislike" | null>(null);
  const [isSavingReaction, setIsSavingReaction] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isSavingToPlaylists, setIsSavingToPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistKind, setNewPlaylistKind] = useState<PlaylistKind>("user");
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<Visibility>("private");
  const [actionInfo, setActionInfo] = useState("");
  const [playlistMembershipCount, setPlaylistMembershipCount] = useState<number | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const pusher = useMemo(() => createPusherClient(), []);

  /** Один проход: счётчики реакций, сессия, владелец, моя реакция, плейлисты — без двойного getUser. */
  const loadWatchActionsData = useCallback(async () => {
    const { data: likeRows } = await supabase.from("likes").select("type").eq("video_id", videoId);
    const likeCount = (likeRows ?? []).filter((row) => row.type === "like").length;
    const dislikeCount = (likeRows ?? []).filter((row) => row.type === "dislike").length;
    setLikesCount(likeCount);
    setDislikesCount(dislikeCount);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user ?? null;
    if (!user) {
      setIsAuth(false);
      setMyReaction(null);
      setIsVideoOwner(false);
      setPlaylistMembershipCount(null);
      return { likesCount: likeCount, dislikesCount: dislikeCount };
    }
    setIsAuth(true);

    const [videoMeta, myRow, mine, links] = await Promise.all([
      supabase.from("videos").select("user_id").eq("id", videoId).maybeSingle(),
      supabase.from("likes").select("type").eq("video_id", videoId).eq("user_id", user.id).maybeSingle(),
      supabase.from("playlists").select("id").eq("user_id", user.id),
      supabase.from("playlist_videos").select("playlist_id").eq("video_id", videoId),
    ]);

    setIsVideoOwner(videoMeta.data?.user_id === user.id);
    setMyReaction((myRow.data?.type as "like" | "dislike" | undefined) ?? null);

    const mineIds = new Set((mine.data ?? []).map((r) => r.id as string));
    if (mineIds.size === 0) {
      setPlaylistMembershipCount(0);
    } else {
      const n = (links.data ?? []).filter((row) =>
        mineIds.has((row as { playlist_id: string }).playlist_id),
      ).length;
      setPlaylistMembershipCount(n);
    }

    return { likesCount: likeCount, dislikesCount: dislikeCount };
  }, [supabase, videoId]);

  useEffect(() => {
    void loadWatchActionsData();
  }, [loadWatchActionsData]);

  useEffect(() => {
    setNewPlaylistKind(isVideoOwner ? "channel" : "user");
  }, [isVideoOwner]);

  const onReact = async (type: "like" | "dislike") => {
    if (!isAuth) {
      setActionInfo("Войдите, чтобы оценивать видео.");
      return;
    }
    try {
      setIsSavingReaction(true);
      setActionInfo("");
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return;

      if (myReaction === type) {
        await supabase.from("likes").delete().eq("video_id", videoId).eq("user_id", uid);
      } else {
        await supabase.from("likes").upsert(
          { video_id: videoId, user_id: uid, type },
          { onConflict: "user_id,video_id" },
        );
      }
      const next = await loadWatchActionsData();
      await triggerPusherEvent({
        channel: `video-${videoId}`,
        event: "reactions:updated",
        payload: { videoId, likesCount: next.likesCount, dislikesCount: next.dislikesCount },
      });
    } finally {
      setIsSavingReaction(false);
    }
  };

  useEffect(() => {
    // Реалтайм обновление лайков/дизлайков.
    const channel = pusher.subscribe(`video-${videoId}`);
    const handler = (data: unknown) => {
      const payload = typeof data === "object" && data ? (data as { videoId?: string }) : {};
      if (payload.videoId && payload.videoId !== videoId) return;
      void loadWatchActionsData();
    };

    channel.bind("reactions:updated", handler);

    return () => {
      channel.unbind("reactions:updated", handler);
      pusher.unsubscribe(`video-${videoId}`);
    };
  }, [pusher, videoId, loadWatchActionsData]);

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const ok = await copyTextToClipboard(url);
    setActionInfo(ok ? "Ссылка скопирована." : "Не удалось скопировать. Выделите адрес вручную в адресной строке.");
  };

  const openPlaylists = async () => {
    setIsPlaylistOpen(true);
    setActionInfo("");
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) {
      setActionInfo("Войдите, чтобы сохранять в плейлист.");
      return;
    }
    const { data: list } = await supabase
      .from("playlists")
      .select("id, title, visibility, is_system")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setPlaylists((list as PlaylistItem[]) ?? []);

    const { data: existing } = await supabase
      .from("playlist_videos")
      .select("playlist_id")
      .eq("video_id", videoId);
    setSelectedPlaylistIds((existing ?? []).map((row) => row.playlist_id));
  };

  const createPlaylist = async () => {
    const normalized = newPlaylistName.trim();
    if (!normalized) return;
    if (newPlaylistKind === "channel" && !isVideoOwner) {
      setActionInfo("Канальный плейлист можно создать только для вашего видео.");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;
    const { data: created } = await supabase
      .from("playlists")
      .insert({
        user_id: uid,
        title: normalized,
        kind: newPlaylistKind,
        visibility: newPlaylistVisibility,
      })
      .select("id, title, visibility, is_system")
      .single();
    if (created) {
      setPlaylists((prev) => [created as PlaylistItem, ...prev]);
      setSelectedPlaylistIds((prev) => [created.id, ...prev]);
      setNewPlaylistName("");
      setNewPlaylistKind(isVideoOwner ? "channel" : "user");
      setNewPlaylistVisibility("private");
    }
  };

  const savePlaylists = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;
    try {
      setIsSavingToPlaylists(true);
      const { data: existing } = await supabase
        .from("playlist_videos")
        .select("playlist_id")
        .eq("video_id", videoId);
      const existingIds = new Set((existing ?? []).map((row) => row.playlist_id as string));
      const targetIds = new Set(selectedPlaylistIds);
      const toAdd = selectedPlaylistIds.filter((id) => !existingIds.has(id));
      const toDelete = Array.from(existingIds).filter((id) => !targetIds.has(id));

      if (toAdd.length > 0) {
        const payload = toAdd.map((playlistId, index) => ({
          playlist_id: playlistId,
          video_id: videoId,
          position: index + 1,
        }));
        await supabase.from("playlist_videos").upsert(payload, { onConflict: "playlist_id,video_id" });
      }
      if (toDelete.length > 0) {
        await supabase.from("playlist_videos").delete().in("playlist_id", toDelete).eq("video_id", videoId);
      }
      setActionInfo("Плейлисты обновлены.");
      setIsPlaylistOpen(false);
      void loadWatchActionsData();
    } finally {
      setIsSavingToPlaylists(false);
    }
  };

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded-full border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => onReact("like")}
            disabled={isSavingReaction}
            className={clsx(
              "inline-flex items-center gap-2 px-3 py-1.5 text-sm transition",
              myReaction === "like" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-200 hover:bg-white/10",
            )}
          >
            <ThumbsUp className="h-4 w-4" />
            {likesCount.toLocaleString("ru-RU")}
          </button>
          <div className="w-px bg-white/10" />
          <button
            type="button"
            onClick={() => onReact("dislike")}
            disabled={isSavingReaction}
            className={clsx(
              "inline-flex items-center gap-2 px-3 py-1.5 text-sm transition",
              myReaction === "dislike" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-200 hover:bg-white/10",
            )}
          >
            <ThumbsDown className="h-4 w-4" />
            {dislikesCount.toLocaleString("ru-RU")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isVideoOwner ? <ReportDialog targetType="video" targetId={videoId} label="Жалоба" /> : null}
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <Copy className="h-4 w-4" /> Поделиться
          </button>
          <button
            type="button"
            onClick={openPlaylists}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <BookmarkPlus className="h-4 w-4" />
            {playlistMembershipCount !== null && playlistMembershipCount > 0
              ? `В плейлистах (${playlistMembershipCount})`
              : "Сохранить"}
          </button>
        </div>
      </div>
      {actionInfo ? <p className="mt-2 text-xs text-cyan-200/90">{actionInfo}</p> : null}

      {isPlaylistOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#10182a] p-4">
            <h3 className="text-lg font-semibold text-slate-100">Сохранить в плейлист</h3>
            <div className="mt-3 max-h-64 space-y-1 overflow-auto pr-1">
              {playlists.map((playlist) => {
                const checked = selectedPlaylistIds.includes(playlist.id);
                return (
                  <label
                    key={playlist.id}
                    className={checked
                      ? "flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100"
                      : "flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200"}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setSelectedPlaylistIds((prev) =>
                          event.target.checked ? [...prev, playlist.id] : prev.filter((id) => id !== playlist.id),
                        );
                      }}
                    />
                    <span className="truncate">{playlist.title}</span>
                    {playlist.is_system ? <span className="ml-auto text-[11px] text-slate-400">system</span> : null}
                  </label>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-[#0b1120] p-3">
              <p className="mb-2 text-xs text-slate-400">Создать новый плейлист</p>
              <select
                value={newPlaylistKind}
                onChange={(event) => setNewPlaylistKind(event.target.value as PlaylistKind)}
                className="mb-2 w-full rounded-lg border border-white/10 bg-[#0a1020] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
              >
                {isVideoOwner ? <option value="channel">Плейлист канала</option> : null}
                <option value="user">Пользовательский плейлист</option>
              </select>
              <input
                value={newPlaylistName}
                onChange={(event) => setNewPlaylistName(event.target.value)}
                placeholder="Название плейлиста"
                className="w-full rounded-lg border border-white/10 bg-[#0a1020] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
              />
              <select
                value={newPlaylistVisibility}
                onChange={(event) => setNewPlaylistVisibility(event.target.value as Visibility)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#0a1020] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
              >
                <option value="private">Только мне</option>
                <option value="unlisted">По ссылке</option>
                <option value="public">Публичный</option>
              </select>
              <button
                type="button"
                onClick={createPlaylist}
                className="mt-2 rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/30"
              >
                Создать
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPlaylistOpen(false)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={savePlaylists}
                disabled={isSavingToPlaylists}
                className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {isSavingToPlaylists ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
