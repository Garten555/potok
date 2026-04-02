"use client";

import { ChannelStats, type ChannelStatsProps } from "@/components/studio/channel-stats";
import { StudioCard } from "@/components/studio/studio-card";
import { StudioSectionTitle } from "@/components/studio/studio-section-title";

export function StudioStatsView({ channelStats }: { channelStats: ChannelStatsProps | null }) {
  return (
    <StudioCard>
      <StudioSectionTitle>Статистика</StudioSectionTitle>
      {channelStats ? (
        <div className="mt-4">
          <ChannelStats
            subscribersCount={channelStats.subscribersCount}
            totalViews={channelStats.totalViews}
            videosCount={channelStats.videosCount}
            viewsSeries={channelStats.viewsSeries}
            subsSeries={channelStats.subsSeries}
          />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0c1323]/40 p-4 sm:p-5 text-sm text-slate-300">
          Загрузка статистики...
        </div>
      )}
    </StudioCard>
  );
}

