"use client";

import { useMemo } from "react";
import { PlyrVideo } from "@/components/video/plyr-video";
import { plyrRuI18n } from "@/lib/plyr-ru";

type WatchPlayerProps = {
  videoUrl: string | null;
  posterUrl?: string | null;
};

export function WatchPlayer({ videoUrl, posterUrl }: WatchPlayerProps) {
  const source = useMemo(
    () =>
      videoUrl
        ? {
            type: "video" as const,
            title: "Видео",
            poster: posterUrl || undefined,
            // Без жёсткого type: браузер/Plyr определят по ответу; mp4 в БД не гарантирован
            sources: [{ src: videoUrl }],
          }
        : null,
    [videoUrl, posterUrl],
  );

  const options = useMemo(
    () => ({
      i18n: plyrRuI18n,
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "settings",
        "fullscreen",
      ],
    }),
    [],
  );

  if (!videoUrl || !source) {
    return (
      <div className="grid aspect-video place-items-center text-sm text-slate-400">
        Видео временно недоступно.
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden [&_.plyr]:h-full [&_.plyr]:w-full [&_.plyr__video-wrapper]:h-full [&_.plyr__video-wrapper]:w-full [&_.plyr__video]:h-full [&_.plyr__video]:object-contain">
      <PlyrVideo
        key={videoUrl}
        className="h-full w-full"
        source={source}
        options={options}
      />
    </div>
  );
}
