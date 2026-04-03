import Link from "next/link";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { ChannelVerifiedBadge } from "@/components/channel/channel-verified-badge";
import { SubscribeButton } from "@/components/channel/subscribe-button";
import { WatchActions } from "@/components/watch/watch-actions";
import { WatchDescription } from "@/components/watch/watch-description";
import { WatchViews } from "@/components/watch/watch-views";

type VideoVisibility = "public" | "unlisted" | "private";

export type WatchVideoMeta = {
  id: string;
  title: string;
  description: string | null;
  views: number | null;
  visibility: VideoVisibility;
  created_at: string | null;
  user_id: string;
};

export type WatchAuthorMeta = {
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
  subscribers_count?: number | null;
  channel_verified?: boolean;
};

type VideoMetaBlockProps = {
  video: WatchVideoMeta;
  author: WatchAuthorMeta | null;
  viewerId?: string | null;
  initiallySubscribed?: boolean;
};

export function VideoMetaBlock({
  video,
  author,
  viewerId,
  initiallySubscribed = false,
}: VideoMetaBlockProps) {
  const channelName = author?.channel_name ?? "Неизвестный канал";
  const channelHandle = author?.channel_handle ?? null;
  const avatarUrl = author?.avatar_url ?? null;
  const subs = author?.subscribers_count;
  const isViewerVideoOwner = Boolean(viewerId && viewerId === video.user_id);

  const visibilityLabel =
    video.visibility === "private" ? "Приватное" : video.visibility === "unlisted" ? "По ссылке" : "Публичное";

  const dateLabel = video.created_at
    ? new Date(video.created_at).toLocaleDateString("ru-RU", { year: "numeric", month: "short", day: "2-digit" })
    : null;

  return (
    <div className="mt-3">
      <h1 className="text-xl font-semibold leading-snug text-slate-100 sm:text-2xl">{video.title}</h1>

      <div className="mt-4 flex flex-col gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
            <ChannelAvatar channelName={channelName} avatarUrl={avatarUrl} variant="video" />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Link
                  href={channelHandle ? `/@${channelHandle}` : "/"}
                  className="truncate text-base font-semibold text-slate-100 transition hover:text-cyan-200"
                >
                  {channelName}
                </Link>
                {author?.channel_verified ? <ChannelVerifiedBadge size="sm" /> : null}
              </div>
              {channelHandle ? (
                <p className="mt-0.5 truncate text-sm text-slate-400">@{channelHandle}</p>
              ) : null}
              {subs !== null && subs !== undefined ? (
                <p className="mt-1 text-sm text-slate-500">
                  {subs.toLocaleString("ru-RU")} подписчиков
                </p>
              ) : null}
            </div>
            <div className="shrink-0 pt-0.5">
              <SubscribeButton
                channelId={video.user_id}
                viewerId={viewerId ?? undefined}
                initiallySubscribed={initiallySubscribed}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-sm text-slate-400 sm:min-w-[12rem] sm:items-end sm:text-right">
            <div>
              <WatchViews videoId={video.id} initialViews={video.views ?? 0} />
              {dateLabel ? <span> · {dateLabel}</span> : null}
            </div>
            <span className="text-xs text-slate-500">{visibilityLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <WatchActions videoId={video.id} initialVideoOwner={isViewerVideoOwner} />
      </div>

      <WatchDescription text={video.description} />
    </div>
  );
}
