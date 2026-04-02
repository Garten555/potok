"use client";

import Link from "next/link";
import clsx from "clsx";
import { ChannelAvatar } from "@/components/channel/channel-avatar";
import { SubscribeButton } from "@/components/channel/subscribe-button";

export type SearchShelfChannel = {
  id: string;
  channel_name: string;
  channel_handle: string | null;
  avatar_url: string | null;
  subscribers_count: number;
};

type SearchChannelShelfProps = {
  channel: SearchShelfChannel;
  viewerId: string | null;
  initiallySubscribed: boolean;
  /** Короткий текст под метаданными (например начало описания последнего видео) */
  teaser?: string | null;
};

/**
 * Крупный блок канала вверху выдачи поиска (как channel shelf на YouTube).
 */
export function SearchChannelShelf({
  channel,
  viewerId,
  initiallySubscribed,
  teaser,
}: SearchChannelShelfProps) {
  const href =
    channel.channel_handle && channel.channel_handle.length > 0
      ? `/@${channel.channel_handle}`
      : "/";

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1628]/95 to-[#0a101c]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <Link
          href={href}
          className="mx-auto shrink-0 sm:mx-0"
          aria-label={`Канал ${channel.channel_name}`}
        >
          <ChannelAvatar
            channelName={channel.channel_name}
            avatarUrl={channel.avatar_url}
            variant="channel"
            className="!h-[4.5rem] !w-[4.5rem] !text-2xl sm:!h-24 sm:!w-24 sm:!text-3xl"
          />
        </Link>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <Link href={href} className="group inline-block max-w-full">
            <h2
              className={clsx(
                "text-xl font-bold leading-tight tracking-tight text-slate-50",
                "transition group-hover:text-cyan-100 sm:text-2xl",
              )}
            >
              {channel.channel_name}
            </h2>
          </Link>
          <p className="mt-1.5 text-sm text-slate-400">
            {channel.channel_handle ? (
              <>
                <span className="text-slate-300">@{channel.channel_handle}</span>
                <span className="text-slate-600"> · </span>
              </>
            ) : null}
            <span>
              {(channel.subscribers_count ?? 0).toLocaleString("ru-RU")}{" "}
              подписчиков
            </span>
          </p>
          {teaser && teaser.trim() ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{teaser.trim()}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Канал на POTOK</p>
          )}
        </div>

        <div className="flex shrink-0 justify-center sm:justify-end sm:pt-1">
          <SubscribeButton
            channelId={channel.id}
            viewerId={viewerId ?? undefined}
            initiallySubscribed={initiallySubscribed}
          />
        </div>
      </div>
    </div>
  );
}
