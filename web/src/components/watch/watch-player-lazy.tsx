"use client";

import dynamic from "next/dynamic";

/** Отдельный клиентский boundary: code-split плеера без тяжёлого чанка в первом бандле страницы. */
export const WatchPlayerLazy = dynamic(
  () => import("@/components/watch/watch-player").then((m) => m.WatchPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="grid aspect-video place-items-center rounded-2xl bg-black/50 text-sm text-slate-500">
        Загрузка плеера…
      </div>
    ),
  },
);
