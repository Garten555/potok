import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ContentUnavailableStub } from "@/components/public-content/content-unavailable-stub";
import { WatchPlayerLazy } from "@/components/watch/watch-player-lazy";
import { CommentsSection } from "@/components/watch/comments-section";
import { WatchMarkCommentNotificationsRead } from "@/components/watch/watch-mark-comment-notifications-read";
import { RecommendationsPanel } from "@/components/watch/recommendations-panel";
import { VideoMetaBlock } from "@/components/watch/video-meta-block";
import { PlaylistWatchPanel } from "@/components/watch/playlist-watch-panel";
import { pusherServer } from "@/lib/pusher/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { loadPlaylistForWatch } from "@/lib/watch-playlist";
import { scoreVideoForWatchSidebar, type VideoRecInput } from "@/lib/recommendations";
import type { RecommendationItem } from "@/components/watch/recommendations-panel";

type WatchPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ list?: string }>;
};

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const listId = typeof sp?.list === "string" ? sp.list : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: videoWithVisibility, error: videoWithVisibilityError } = await supabase
    .from("videos")
    .select(
      "id, user_id, title, description, video_url, thumbnail_url, views, visibility, created_at, category_id, photosensitive_warning",
    )
    .eq("id", id)
    .maybeSingle();

  let video = videoWithVisibility;

  if (
    videoWithVisibilityError &&
    videoWithVisibilityError.message.toLowerCase().includes("column") &&
    (videoWithVisibilityError.message.toLowerCase().includes("visibility") ||
      videoWithVisibilityError.message.toLowerCase().includes("photosensitive"))
  ) {
    const { data: fallbackVideo } = await supabase
      .from("videos")
      .select("id, user_id, title, description, video_url, thumbnail_url, views, created_at, category_id")
      .eq("id", id)
      .maybeSingle();

    if (fallbackVideo) {
      video = { ...fallbackVideo, visibility: "public", photosensitive_warning: false };
    }
  }

  if (!video) notFound();

  const isOwner = viewer?.id === video.user_id;
  if (video.visibility === "private" && !isOwner) notFound();

  const { data: ownerRow } = await supabase
    .from("users")
    .select("account_frozen_at")
    .eq("id", video.user_id)
    .maybeSingle();
  const ownerFrozen = Boolean((ownerRow as { account_frozen_at?: string | null } | null)?.account_frozen_at);
  if (ownerFrozen && !isOwner) {
    return <ContentUnavailableStub kind="video" />;
  }

  // Считаем просмотр максимум 1 раз на пользователя.
  if (viewer?.id) {
    try {
      const { data: existing } = await supabase
        .from("watch_history")
        .select("video_id")
        .eq("user_id", viewer.id)
        .eq("video_id", video.id)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from("watch_history")
          .upsert(
            {
              user_id: viewer.id,
              video_id: video.id,
              watched_at: new Date().toISOString(),
            },
            { onConflict: "user_id,video_id" },
          );

        const supabaseService = createSupabaseServiceClient();
        const nextViews = (video.views ?? 0) + 1;
        await supabaseService.from("videos").update({ views: nextViews }).eq("id", video.id);
        await pusherServer.trigger(`video-${video.id}`, "views:updated", { videoId: video.id, views: nextViews });
        video = { ...video, views: nextViews };
      }
    } catch {
      // Просмотры не должны ломать страницу просмотра.
    }
  }

  const { data: channelInfo } = await supabase
    .from("users")
    .select("channel_name, channel_handle, avatar_url, subscribers_count, channel_verified")
    .eq("id", video.user_id)
    .maybeSingle();

  const { data: viewerSubscription } = viewer
    ? await supabase
        .from("subscriptions")
        .select("subscriber_id")
        .eq("subscriber_id", viewer.id)
        .eq("channel_id", video.user_id)
        .maybeSingle()
    : { data: null };

  const categoryId =
    "category_id" in video ? ((video as { category_id?: string | null }).category_id ?? null) : null;

  const relatedQuery = supabase
    .from("videos")
    .select("id, title, thumbnail_url, views, user_id, created_at, category_id")
    .neq("id", video.id)
    .order("created_at", { ascending: false })
    .limit(80);

  const { data: relatedRaw } = isOwner
    ? await relatedQuery
    : await relatedQuery.in("visibility", ["public", "unlisted"]);

  const candidates = relatedRaw ?? [];
  const candidateIds = candidates.map((v) => v.id);

  const likeMap = new Map<string, number>();
  if (candidateIds.length > 0) {
    const { data: likeRows } = await supabase
      .from("likes")
      .select("video_id")
      .eq("type", "like")
      .in("video_id", candidateIds);
    for (const row of likeRows ?? []) {
      const vid = String((row as { video_id: string }).video_id);
      likeMap.set(vid, (likeMap.get(vid) ?? 0) + 1);
    }
  }

  let subscribedChannelIds = new Set<string>();
  let watchedVideoIds = new Set<string>();
  let likedVideoIds = new Set<string>();
  if (viewer?.id) {
    const { data: subs } = await supabase.from("subscriptions").select("channel_id").eq("subscriber_id", viewer.id);
    subscribedChannelIds = new Set((subs ?? []).map((s) => String((s as { channel_id: string }).channel_id)));
    const { data: wh } = await supabase
      .from("watch_history")
      .select("video_id")
      .eq("user_id", viewer.id)
      .order("watched_at", { ascending: false })
      .limit(80);
    watchedVideoIds = new Set((wh ?? []).map((w) => String((w as { video_id: string }).video_id)));
    const { data: lk } = await supabase
      .from("likes")
      .select("video_id")
      .eq("user_id", viewer.id)
      .eq("type", "like");
    likedVideoIds = new Set((lk ?? []).map((l) => String((l as { video_id: string }).video_id)));
  }

  const now = Date.now();
  const recCtx = {
    now,
    subscribedChannelIds,
    likedVideoIds,
    watchedVideoIds,
  };
  const currentWatch = {
    videoId: video.id,
    authorId: video.user_id,
    categoryId,
  };

  const scored = (candidates as VideoRecInput[]).map((v) => ({
    v,
    s: scoreVideoForWatchSidebar(
      { ...v, like_count: likeMap.get(v.id) ?? 0 },
      currentWatch,
      recCtx,
    ),
  }));
  scored.sort((a, b) => b.s - a.s);
  const recommendations: RecommendationItem[] = scored.slice(0, 12).map((x) => ({
    id: x.v.id,
    title: x.v.title,
    thumbnail_url: x.v.thumbnail_url,
    views: x.v.views,
    created_at: x.v.created_at ?? null,
  }));

  const author =
    channelInfo && (channelInfo.channel_name || channelInfo.channel_handle || channelInfo.avatar_url)
      ? {
          channel_name: channelInfo.channel_name,
          channel_handle: channelInfo.channel_handle,
          avatar_url: channelInfo.avatar_url,
          subscribers_count: channelInfo.subscribers_count ?? 0,
          channel_verified: Boolean((channelInfo as { channel_verified?: boolean }).channel_verified),
        }
      : null;

  const playlistData = listId
    ? await loadPlaylistForWatch(supabase, listId, viewer?.id ?? null)
    : null;

  const showPlaylist =
    Boolean(listId && playlistData && playlistData.items.length > 0);

  const photosensitiveWarning = Boolean(
    (video as { photosensitive_warning?: boolean }).photosensitive_warning,
  );

  return (
    <div>
      <WatchMarkCommentNotificationsRead videoId={video.id} />
      <AppHeader />
      <main className="w-full px-2 pb-10 pt-4 sm:px-4 sm:pt-4 lg:px-6">
        <div
          className={
            showPlaylist
              ? "mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,36vw)] xl:gap-6 xl:grid-cols-[minmax(0,1fr)_480px] 2xl:grid-cols-[minmax(0,1fr)_540px]"
              : "mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]"
          }
        >
          <section className="min-w-0">
            {photosensitiveWarning ? (
              <div className="mb-3 rounded-xl border border-amber-400/35 bg-amber-500/15 px-4 py-3 text-sm leading-snug text-amber-50">
                <span className="font-semibold">Фоточувствительность:</span> в ролике возможны вспышки и быстрая смена
                изображения. Если вам не рекомендован такой контент — не смотрите видео.
              </div>
            ) : null}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <WatchPlayerLazy videoUrl={video.video_url} posterUrl={video.thumbnail_url} />
            </div>

            <VideoMetaBlock
              video={{
                id: video.id,
                title: video.title,
                description: video.description,
                views: video.views,
                visibility: video.visibility,
                created_at: video.created_at ?? null,
                user_id: video.user_id,
              }}
              author={author}
              viewerId={viewer?.id ?? null}
              initiallySubscribed={Boolean(viewerSubscription)}
            />

            {/* На мобильных показываем рекомендации сразу, чтобы они были видны. */}
            <div className="mt-6 lg:hidden">
              {showPlaylist && listId && playlistData ? (
                <PlaylistWatchPanel
                  playlistId={listId}
                  playlistTitle={playlistData.title}
                  items={playlistData.items}
                  currentVideoId={video.id}
                />
              ) : (
                <RecommendationsPanel items={recommendations} />
              )}
            </div>

            <CommentsSection videoId={video.id} videoOwnerId={video.user_id} viewerId={viewer?.id ?? null} />
          </section>

          <aside className="hidden min-w-0 lg:sticky lg:top-4 lg:block lg:self-start">
            {showPlaylist && listId && playlistData ? (
              <PlaylistWatchPanel
                playlistId={listId}
                playlistTitle={playlistData.title}
                items={playlistData.items}
                currentVideoId={video.id}
              />
            ) : (
              <RecommendationsPanel items={recommendations} />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

