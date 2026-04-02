import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlaylistWatchItem } from "@/components/watch/playlist-watch-panel";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Загрузка плейлиста для страницы просмотра (учёт RLS и видимости видео). */
export async function loadPlaylistForWatch(
  supabase: SupabaseClient,
  playlistId: string,
  viewerId: string | null,
): Promise<{ title: string; items: PlaylistWatchItem[] } | null> {
  if (!UUID_RE.test(playlistId)) return null;

  const { data: pl, error: plErr } = await supabase
    .from("playlists")
    .select("id, title")
    .eq("id", playlistId)
    .maybeSingle();

  if (plErr || !pl) return null;

  const { data: rows, error: pvErr } = await supabase
    .from("playlist_videos")
    .select("video_id, position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  if (pvErr || !rows?.length) return null;

  const ids = rows.map((r) => r.video_id);
  const { data: vids } = await supabase
    .from("videos")
    .select("id, title, thumbnail_url, views, visibility, user_id, created_at")
    .in("id", ids);

  const vmap = new Map((vids ?? []).map((v) => [v.id, v]));

  const items: PlaylistWatchItem[] = [];
  for (const r of rows) {
    const v = vmap.get(r.video_id);
    if (!v) continue;
    const isOwner = viewerId !== null && viewerId === v.user_id;
    if (v.visibility === "private" && !isOwner) continue;
    items.push({
      id: v.id,
      position: r.position,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      views: v.views ?? 0,
      created_at: v.created_at ?? null,
    });
  }

  if (items.length === 0) return null;

  return { title: pl.title, items };
}
