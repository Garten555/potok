"use client";

import dynamic from "next/dynamic";

/** Отдельный клиентский boundary: code-split плеера без тяжёлого чанка в первом бандле страницы. */
export const WatchPlayerLazy = dynamic(
  () => import("@/components/watch/watch-player").then((m) => m.WatchPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video w-full rounded-2xl bg-black" aria-hidden />
    ),
  },
);
