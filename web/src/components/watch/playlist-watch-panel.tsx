"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import clsx from "clsx";

export type PlaylistWatchItem = {
  id: string;
  position: number;
  title: string;
  thumbnail_url: string | null;
  views: number;
  created_at: string | null;
};

type PlaylistWatchPanelProps = {
  playlistId: string;
  playlistTitle: string;
  items: PlaylistWatchItem[];
  currentVideoId: string;
};

export function PlaylistWatchPanel({
  playlistId,
  playlistTitle,
  items,
  currentVideoId,
}: PlaylistWatchPanelProps) {
  const activeWrapRef = useRef<HTMLDivElement | null>(null);
  const idx = items.findIndex((i) => i.id === currentVideoId);
  const prev = idx > 0 ? items[idx - 1] : null;
  const next = idx >= 0 && idx < items.length - 1 ? items[idx + 1] : null;

  useEffect(() => {
    activeWrapRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentVideoId]);

  return (
    <aside
      className="flex w-full min-h-[min(400px,60vh)] max-h-[min(560px,72vh)] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0c1323]/80 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] lg:max-h-none lg:min-h-[28rem] lg:h-[calc(100vh-5.5rem)]"
    >
      <div className="shrink-0 space-y-3 border-b border-white/10 p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Плейлист</p>
          <h2 className="mt-1 line-clamp-3 text-base font-semibold leading-snug text-slate-100 sm:text-lg">
            {playlistTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            {idx >= 0 ? `${idx + 1} из ${items.length}` : `${items.length} видео`}
          </p>
        </div>
        <div className="flex gap-2">
          {prev ? (
            <Link
              href={`/watch/${prev.id}?list=${playlistId}`}
              className="flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 text-center text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              ← Предыдущее
            </Link>
          ) : (
            <span className="flex-1 rounded-lg border border-transparent px-3 py-2.5 text-center text-sm text-slate-600">
              ← Предыдущее
            </span>
          )}
          {next ? (
            <Link
              href={`/watch/${next.id}?list=${playlistId}`}
              className="flex-1 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2.5 text-center text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25"
            >
              Следующее →
            </Link>
          ) : (
            <span className="flex-1 rounded-lg border border-transparent px-3 py-2.5 text-center text-sm text-slate-600">
              Следующее →
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <ol className="space-y-2">
          {items.map((item, i) => {
            const active = item.id === currentVideoId;
            const published = item.created_at
              ? new Date(item.created_at).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null;
            return (
              <li key={item.id}>
                <div ref={active ? activeWrapRef : undefined}>
                  <Link
                    href={`/watch/${item.id}?list=${playlistId}`}
                    className={clsx(
                      "flex gap-3 rounded-xl border p-2.5 transition sm:p-3",
                      active
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-transparent bg-white/[0.02] hover:bg-white/[0.06]",
                    )}
                  >
                    <span className="w-7 shrink-0 pt-1.5 text-center text-sm tabular-nums text-slate-500">
                      {i + 1}
                    </span>
                    <div
                      className="aspect-video w-[min(44vw,11rem)] shrink-0 overflow-hidden rounded-lg bg-[#0b1323] bg-cover bg-center sm:w-40"
                      style={item.thumbnail_url ? { backgroundImage: `url(${item.thumbnail_url})` } : undefined}
                    />
                    <div className="min-w-0 flex-1 py-0.5">
                      <p
                        className={clsx(
                          "line-clamp-3 text-sm font-medium leading-snug sm:text-[15px]",
                          active ? "text-cyan-100" : "text-slate-100",
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(item.views ?? 0).toLocaleString("ru-RU")} просмотров
                        {published ? (
                          <>
                            {" · "}
                            {published}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
