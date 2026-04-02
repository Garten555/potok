"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChannelBannerStrip, ChannelBrandingControls } from "@/components/channel/branding-editor";
import { ChannelHomeLayoutEditor } from "@/components/channel/channel-home-layout-editor";
import { ChannelIdentityForm } from "@/components/studio/channel-identity-form";
import type { ChannelHomeLayoutRow, ChannelPlaylistCard } from "@/lib/channel-home-types";

function thumbFromJoinedVideos(
  videos: { thumbnail_url: string | null } | { thumbnail_url: string | null }[] | null,
): string | null {
  if (!videos) return null;
  const v = Array.isArray(videos) ? videos[0] : videos;
  return v?.thumbnail_url ?? null;
}

export function StudioChannelAppearancePanel() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [channelHandle, setChannelHandle] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<ChannelPlaylistCard[]>([]);
  const [layoutRows, setLayoutRows] = useState<ChannelHomeLayoutRow[]>([]);
  const [channelShowPlayAll, setChannelShowPlayAll] = useState(true);
  const [savingPlayAll, setSavingPlayAll] = useState(false);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setPlaylists([]);
      setLayoutRows([]);
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data: profileRow } = await supabase
      .from("users")
      .select("channel_name, channel_handle, avatar_url, banner_url, channel_show_play_all")
      .eq("id", user.id)
      .maybeSingle();
    const prof = profileRow as {
      channel_name: string | null;
      channel_handle: string | null;
      avatar_url: string | null;
      banner_url: string | null;
      channel_show_play_all?: boolean | null;
    } | null;
    setChannelName(prof?.channel_name?.trim() || "Канал");
    setChannelHandle(prof?.channel_handle?.trim() ?? null);
    setAvatarUrl(prof?.avatar_url ?? null);
    setBannerUrl(prof?.banner_url ?? null);
    setChannelShowPlayAll(prof?.channel_show_play_all !== false);

    const { data: channelPlaylistRows } = await supabase
      .from("playlists")
      .select("id, title, description, visibility, created_at")
      .eq("user_id", user.id)
      .eq("is_system", false)
      .eq("kind", "channel")
      .order("created_at", { ascending: false });

    const playlistIds = (channelPlaylistRows ?? []).map((p) => p.id);
    let channelPlaylists: ChannelPlaylistCard[] = [];

    if (playlistIds.length > 0) {
      const { data: pvRows } = await supabase
        .from("playlist_videos")
        .select("playlist_id, position, video_id, videos(thumbnail_url)")
        .in("playlist_id", playlistIds);

      const byPlaylist = new Map<string, Array<{ position: number; video_id: string; thumb: string | null }>>();
      for (const raw of pvRows ?? []) {
        const row = raw as {
          playlist_id: string;
          position: number;
          video_id: string;
          videos: { thumbnail_url: string | null } | { thumbnail_url: string | null }[] | null;
        };
        const thumb = thumbFromJoinedVideos(row.videos);
        const arr = byPlaylist.get(row.playlist_id) ?? [];
        arr.push({ position: row.position, video_id: row.video_id, thumb });
        byPlaylist.set(row.playlist_id, arr);
      }

      channelPlaylists = (channelPlaylistRows ?? []).map((p) => {
        const arr = (byPlaylist.get(p.id) ?? []).slice().sort((a, b) => a.position - b.position);
        const first = arr[0];
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          visibility: p.visibility,
          created_at: p.created_at,
          videos_count: arr.length,
          thumbnail_url: first?.thumb ?? null,
          first_video_id: first?.video_id ?? null,
        };
      });
    }
    setPlaylists(channelPlaylists);

    const { data: layoutRaw, error: layoutErr } = await supabase
      .from("channel_home_sections")
      .select("id, position, section_kind, playlist_id, display_title")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (layoutErr || !layoutRaw?.length) {
      setLayoutRows([]);
    } else {
      setLayoutRows(
        layoutRaw.map((r) => ({
          id: r.id,
          position: r.position,
          sectionKind:
            r.section_kind === "uploads"
              ? "uploads"
              : r.section_kind === "spotlight"
                ? "spotlight"
                : "playlist",
          playlistId: r.playlist_id,
          displayTitle: r.display_title,
        })),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#10182a] p-6 text-sm text-slate-400">Загрузка…</div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-sm text-amber-100">
        Войдите в аккаунт, чтобы настроить внешний вид канала.
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[960px] space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">Внешний вид канала</h1>
        <p className="mt-1 text-sm text-slate-400">
          Название канала (адрес /@… подставляется автоматически), оформление и разделы главной.{" "}
          {channelHandle ? (
            <Link href={`/@${channelHandle}`} className="text-cyan-300 underline-offset-2 hover:underline">
              Открыть канал
            </Link>
          ) : (
            <Link href="/" className="text-cyan-300 underline-offset-2 hover:underline">
              На главную
            </Link>
          )}
        </p>
      </div>

      <ChannelIdentityForm />

      <div className="rounded-xl border border-white/10 bg-[#0c1323]/80 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={channelShowPlayAll}
            disabled={savingPlayAll}
            onChange={async (e) => {
              const next = e.target.checked;
              setChannelShowPlayAll(next);
              if (!userId) return;
              setSavingPlayAll(true);
              try {
                const supabase = createSupabaseBrowserClient();
                const { error } = await supabase
                  .from("users")
                  .update({ channel_show_play_all: next })
                  .eq("id", userId);
                if (error) {
                  setChannelShowPlayAll(!next);
                }
              } finally {
                setSavingPlayAll(false);
              }
            }}
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-[#0b1120] text-cyan-500 focus:ring-cyan-400/40"
          />
          <span className="text-sm leading-snug text-slate-200">
            «Воспроизвести всё» у рядов с плейлистами на главной. У ряда «Все видео» (загрузки канала) этой кнопки нет.
          </span>
        </label>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-slate-100">Аватар и шапка</h2>
        <p className="text-sm text-slate-500">
          Как на странице канала: одна кнопка на шапке — открывает редактор. После сохранения страница
          перезагрузится.
        </p>
        <ChannelBannerStrip bannerUrl={bannerUrl}>
          <ChannelBrandingControls
            userId={userId}
            channelName={channelName}
            initialAvatarUrl={avatarUrl}
            initialBannerUrl={bannerUrl}
          />
        </ChannelBannerStrip>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-100">Главная страница канала</h2>
        <ChannelHomeLayoutEditor
          channelUserId={userId}
          channelPlaylists={playlists}
          initialRows={layoutRows}
          onSaved={() => void load()}
        />
      </div>
    </section>
  );
}
