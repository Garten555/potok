"use client";

/** Иконка плейлиста в духе YouTube: список + play */
export function PlaylistStackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 6h16v1.8H4V6zm0 5.1h16v1.8H4v-1.8zm0 5.1h11v1.8H4v-1.8z" />
      <path d="M17.2 13.2 21 16l-3.8 2.8v-5.6z" />
    </svg>
  );
}

/** Превью: слева кадр, справа тёмная полоса с иконкой и числом роликов (как на YouTube). */
export function YoutubeStylePlaylistThumbnail({
  thumbnailUrl,
  videosCount,
  title,
}: {
  thumbnailUrl: string | null;
  videosCount: number;
  title: string;
}) {
  return (
    <div className="relative flex aspect-video w-full overflow-hidden rounded-lg bg-[#212121] shadow-inner ring-1 ring-black/40">
      <div className="relative min-h-0 min-w-0 flex-1">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full min-h-[120px] w-full items-center justify-center bg-gradient-to-br from-[#2a2a2a] to-[#141414] text-xs text-slate-500">
            Нет обложки
          </div>
        )}
      </div>
      <div
        className="flex w-[26%] max-w-[118px] min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 border-l border-black/50 bg-[#1a1a1a] px-1.5 py-3 text-white sm:min-w-[80px]"
        title={`${videosCount} видео в плейлисте «${title}»`}
      >
        <PlaylistStackIcon className="h-7 w-7 shrink-0 opacity-90 sm:h-8 sm:w-8" />
        <span className="text-base font-bold tabular-nums leading-none sm:text-lg">{videosCount}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/65">видео</span>
      </div>
    </div>
  );
}
