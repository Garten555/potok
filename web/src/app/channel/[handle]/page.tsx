import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { ChannelBannerStrip, ChannelBrandingControls } from "@/components/channel/branding-editor";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { ChannelTabs } from "@/components/channel/channel-tabs";
import type { SpotlightChannel } from "@/components/channel/channel-spotlight-strip";
import { SubscribeButton } from "@/components/channel/subscribe-button";
import { ChannelReportButton } from "@/components/channel/channel-report-button";
import type { ChannelHomeSectionResolved, ChannelVideoItem } from "@/lib/channel-home-types";

function playAllHrefUploads(videos: ChannelVideoItem[]): string | null {
  const first = videos[0];
  return first ? `/watch/${first.id}` : null;
}

function playAllHrefPlaylist(videos: ChannelVideoItem[], playlistId: string): string | null {
  const first = videos[0];
  return first ? `/watch/${first.id}?list=${encodeURIComponent(playlistId)}` : null;
}

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
    .select(
      "id, channel_name, channel_handle, avatar_url, banner_url, subscribers_count, created_at, channel_show_play_all, account_frozen_at",
    )
    .ilike("channel_handle", handle)
    .maybeSingle();

  if (error || !user) {
    notFound();
  }

  const isOwner = viewer?.id === user.id;
  const channelFrozen = Boolean((user as { account_frozen_at?: string | null }).account_frozen_at);
  if (channelFrozen && !isOwner) {
    notFound();
  }

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
  const visibilityList = isOwner ? (["public", "unlisted", "private"] as const) : (["public"] as const);

  const { data: channelVideosRaw } = await supabase
    .from("videos")
    .select("id, title, thumbnail_url, views, created_at")
    .eq("user_id", user.id)
    .in("visibility", visibilityList as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(200);

  const channelVideos: ChannelVideoItem[] = (channelVideosRaw ?? []).map((v) => {
    const row = v as {
      id: string;
      title: string;
      thumbnail_url: string | null;
      views: number | null;
      created_at: string;
    };
    return {
      id: row.id,
      title: row.title,
      thumbnail_url: row.thumbnail_url,
      views: row.views ?? 0,
      created_at: row.created_at,
    };
  });

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

  const playlistTitleById = new Map(channelPlaylists.map((p) => [p.id, p.title]));

  const { data: layoutRowsRaw, error: layoutErr } = await supabase
    .from("channel_home_sections")
    .select("id, position, section_kind, playlist_id, display_title")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const layoutRows = layoutErr ? [] : (layoutRowsRaw ?? []);

  const playlistIdsForHome = layoutRows
    .filter((r) => r.section_kind === "playlist" && r.playlist_id)
    .map((r) => String(r.playlist_id));

  let playlistVideosByPlaylistId = new Map<string, ChannelVideoItem[]>();
  if (playlistIdsForHome.length > 0) {
    const { data: pvRows } = await supabase
      .from("playlist_videos")
      .select("playlist_id, position, videos(id, title, thumbnail_url, views, created_at, visibility)")
      .in("playlist_id", playlistIdsForHome);

    const bucket = new Map<string, Array<{ position: number; video: ChannelVideoItem }>>();
    for (const raw of pvRows ?? []) {
      const row = raw as {
        playlist_id: string;
        position: number;
        videos:
          | {
              id: string;
              title: string;
              thumbnail_url: string | null;
              views: number | null;
              created_at: string;
              visibility: string;
            }
          | Array<{
              id: string;
              title: string;
              thumbnail_url: string | null;
              views: number | null;
              created_at: string;
              visibility: string;
            }>
          | null;
      };
      const v = row.videos;
      const vid = Array.isArray(v) ? v[0] : v;
      if (!vid) continue;
      if (!isOwner && vid.visibility !== "public") continue;
      const item: ChannelVideoItem = {
        id: vid.id,
        title: vid.title,
        thumbnail_url: vid.thumbnail_url,
        views: vid.views ?? 0,
        created_at: vid.created_at,
      };
      const arr = bucket.get(row.playlist_id) ?? [];
      arr.push({ position: row.position, video: item });
      bucket.set(row.playlist_id, arr);
    }
    for (const [pid, arr] of bucket) {
      arr.sort((a, b) => a.position - b.position);
      playlistVideosByPlaylistId.set(
        pid,
        arr.map((x) => x.video),
      );
    }
  }

  let homeSections: ChannelHomeSectionResolved[];
  if (layoutRows.length === 0) {
    const vids = channelVideos.slice(0, 48);
    homeSections = [
      {
        id: null,
        sectionKind: "uploads",
        displayTitle: "Видео",
        videos: vids,
        playAllHref: playAllHrefUploads(vids),
      },
    ];
  } else {
    homeSections = [];
    for (const row of layoutRows) {
      if (row.section_kind === "uploads") {
        const displayTitle = row.display_title?.trim() || "Видео";
        const vids = channelVideos.slice(0, 48);
        homeSections.push({
          id: row.id,
          sectionKind: "uploads",
          displayTitle,
          videos: vids,
          playAllHref: playAllHrefUploads(vids),
        });
      } else if (row.section_kind === "spotlight") {
        const displayTitle = row.display_title?.trim() || "Другие каналы";
        homeSections.push({
          id: row.id,
          sectionKind: "spotlight",
          displayTitle,
          videos: [],
          playAllHref: null,
        });
      } else if (row.playlist_id) {
        const displayTitle =
          row.display_title?.trim() || playlistTitleById.get(String(row.playlist_id)) || "Плейлист";
        const pid = String(row.playlist_id);
        const vids = playlistVideosByPlaylistId.get(pid) ?? [];
        homeSections.push({
          id: row.id,
          sectionKind: "playlist",
          displayTitle,
          playlistId: pid,
          videos: vids,
          playAllHref: playAllHrefPlaylist(vids, pid),
        });
      }
    }
  }

  const joinedDate = new Date(user.created_at).toLocaleDateString("ru-RU");

  const { data: spotlightLinkRows } = await supabase
    .from("channel_spotlight_links")
    .select("target_user_id, position")
    .eq("owner_id", user.id)
    .order("position", { ascending: true });

  let spotlightChannels: SpotlightChannel[] = [];
  const slIds = (spotlightLinkRows ?? []).map((r) => (r as { target_user_id: string }).target_user_id);
  if (slIds.length > 0) {
    const { data: spUsers } = await supabase
      .from("users")
      .select("id, channel_name, channel_handle, avatar_url")
      .in("id", slIds);
    const profMap = new Map((spUsers ?? []).map((u) => [u.id as string, u as SpotlightChannel]));
    spotlightChannels = slIds
      .map((id) => profMap.get(id))
      .filter((c): c is SpotlightChannel => Boolean(c?.channel_handle));
  }

  return (
    <div>
      <AppHeader />
      <div className="w-full">
        <ChannelBannerStrip bannerUrl={user.banner_url}>
          {isOwner ? (
            <ChannelBrandingControls
              userId={user.id}
              channelName={user.channel_name ?? ""}
              initialAvatarUrl={user.avatar_url}
              initialBannerUrl={user.banner_url}
            />
          ) : null}
        </ChannelBannerStrip>
        <section className="mt-4 w-full border-y border-white/10 bg-[#0c1120] px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="relative shrink-0" aria-label="Аватар канала">
                <ChannelAvatar
                  channelName={user.channel_name ?? "К"}
                  avatarUrl={user.avatar_url}
                  variant="channel"
                />
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
            <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
              {!isOwner && viewer ? <ChannelReportButton channelUserId={user.id} /> : null}
              {isOwner ? (
                <>
                  <Link
                    href="/studio?tab=channel-home"
                    className="rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10 sm:text-sm"
                  >
                    Внешний вид канала
                  </Link>
                  <Link
                    href="/studio?tab=upload"
                    className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/30 sm:text-sm"
                  >
                    Загрузить видео
                  </Link>
                </>
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
            channelVideos={channelVideos}
            channelPlaylists={channelPlaylists}
            homeSections={homeSections}
            showPlayAllOnHome={user.channel_show_play_all !== false}
            spotlightChannels={spotlightChannels}
          />
          </div>
        </section>
      </div>
    </div>
  );
}
