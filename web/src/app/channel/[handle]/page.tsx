import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { BrandingEditor } from "@/components/channel/branding-editor";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { ChannelTabs } from "@/components/channel/channel-tabs";
import { SubscribeButton } from "@/components/channel/subscribe-button";
import { ChannelReportButton } from "@/components/channel/channel-report-button";

type ChannelPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { handle } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, channel_name, channel_handle, avatar_url, banner_url, subscribers_count, created_at")
    .ilike("channel_handle", handle)
    .maybeSingle();

  if (error || !user) {
    notFound();
  }

  const isOwner = viewer?.id === user.id;

  let videosCountQuery = supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!isOwner) {
    videosCountQuery = videosCountQuery.eq("visibility", "public");
  }
  const { count: videosCount } = await videosCountQuery;
  const { count: subscribersCount } = await supabase
    .from("subscriptions")
    .select("subscriber_id", { count: "exact", head: true })
    .eq("channel_id", user.id);
  const { data: viewerSubscription } = viewer
    ? await supabase
        .from("subscriptions")
        .select("subscriber_id")
        .eq("subscriber_id", viewer.id)
        .eq("channel_id", user.id)
        .maybeSingle()
    : { data: null };
  const { data: latestVideos } = await supabase
    .from("videos")
    .select("id, title, thumbnail_url, views, created_at")
    .eq("user_id", user.id)
    .in("visibility", isOwner ? ["public", "unlisted", "private"] : ["public"])
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: channelPlaylistRows } = await supabase
    .from("playlists")
    .select("id, title, description, visibility, created_at")
    .eq("user_id", user.id)
    .eq("is_system", false)
    .eq("kind", "channel")
    .order("created_at", { ascending: false });

  const playlistIds = (channelPlaylistRows ?? []).map((p) => p.id);
  let channelPlaylists: Array<{
    id: string;
    title: string;
    description: string | null;
    visibility: string;
    created_at: string;
    videos_count: number;
    thumbnail_url: string | null;
    first_video_id: string | null;
  }> = [];

  if (playlistIds.length > 0) {
    const { data: pvRows } = await supabase
      .from("playlist_videos")
      .select("playlist_id, position, video_id, videos(thumbnail_url)")
      .in("playlist_id", playlistIds);

    function thumbFromJoinedVideos(
      videos: { thumbnail_url: string | null } | { thumbnail_url: string | null }[] | null,
    ): string | null {
      if (!videos) return null;
      const v = Array.isArray(videos) ? videos[0] : videos;
      return v?.thumbnail_url ?? null;
    }

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

  const joinedDate = new Date(user.created_at).toLocaleDateString("ru-RU");

  return (
    <div>
      <AppHeader />
      <div className="w-full">
        <section
          className="relative h-40 w-full overflow-hidden border-y border-white/10 bg-[#0f1628] sm:h-56"
          style={
            user.banner_url
              ? {
                  backgroundImage: `url(${user.banner_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {!user.banner_url ? (
            <div className="h-full w-full bg-[radial-gradient(120%_120%_at_15%_20%,rgba(34,211,238,0.35),rgba(15,23,42,0.05)_42%),linear-gradient(135deg,#111c33_0%,#0d1428_55%,#0a1222_100%)]" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08101d] via-[#08101d]/50 to-transparent" />
          {isOwner ? (
            <BrandingEditor
              userId={user.id}
              channelName={user.channel_name}
              initialAvatarUrl={user.avatar_url}
              initialBannerUrl={user.banner_url}
              target="banner"
            />
          ) : null}
        </section>
        <section className="mt-4 w-full border-y border-white/10 bg-[#0c1120] px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="relative shrink-0" aria-label="Аватар канала">
                <ChannelAvatar
                  channelName={user.channel_name ?? "К"}
                  avatarUrl={user.avatar_url}
                  variant="channel"
                />
                {isOwner ? (
                  <BrandingEditor
                    userId={user.id}
                    channelName={user.channel_name}
                    initialAvatarUrl={user.avatar_url}
                    initialBannerUrl={user.banner_url}
                    target="avatar"
                    icon="camera"
                    buttonClassName="right-1 bottom-1 top-auto p-1.5 rounded-md"
                    iconClassName="h-3.5 w-3.5"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-slate-100 sm:text-3xl">
                  {user.channel_name}
                </h1>
                <p className="mt-1 text-sm text-cyan-200/90">@{user.channel_handle}</p>
                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                  На POTOK с {joinedDate}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isOwner && viewer ? <ChannelReportButton channelUserId={user.id} /> : null}
              {isOwner ? (
                <Link
                  href="/studio?tab=upload"
                  className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/30 sm:text-sm"
                >
                  Загрузить видео
                </Link>
              ) : (
                <SubscribeButton
                  channelId={user.id}
                  viewerId={viewer?.id}
                  initiallySubscribed={Boolean(viewerSubscription)}
                />
              )}
            </div>
          </div>

          <ChannelTabs
            channelId={user.id}
            isOwner={isOwner}
            channelName={user.channel_name}
            channelHandle={user.channel_handle}
            subscribersCount={subscribersCount ?? user.subscribers_count}
            videosCount={videosCount ?? 0}
            latestVideos={latestVideos ?? []}
            channelPlaylists={channelPlaylists}
          />
          </div>
        </section>
      </div>
    </div>
  );
}
