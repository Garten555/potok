"use client";

import Link from "next/link";
import { ChannelAvatar } from "@/components/channel/channel-avatar";

export type SpotlightChannel = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
};

type ChannelSpotlightStripProps = {
  title: string;
  channels: SpotlightChannel[];
};

export function ChannelSpotlightStrip({ title, channels }: ChannelSpotlightStripProps) {
  if (channels.length === 0) return null;

  return (
    <section className="min-w-0 border-t border-white/10 pt-6">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">{title}</h2>
      <div className="-mx-1 flex gap-4 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:thin]">
        {channels.map((ch) => {
          const handle = ch.channel_handle?.trim();
          if (!handle) return null;
          return (
            <Link
              key={ch.id}
              href={`/@${handle}`}
              className="group flex w-[min(140px,calc(50vw-2rem))] shrink-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition hover:border-cyan-400/30 hover:bg-white/[0.06]"
            >
              <ChannelAvatar
                channelName={ch.channel_name ?? handle}
                avatarUrl={ch.avatar_url}
                className="!h-14 !w-14 !text-lg"
              />
              <span className="line-clamp-2 text-sm font-medium text-slate-200 group-hover:text-cyan-200">
                {ch.channel_name ?? `@${handle}`}
              </span>
              <span className="line-clamp-1 text-xs text-slate-500">@{handle}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
