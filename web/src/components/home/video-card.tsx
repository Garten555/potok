import type { VideoPreview } from "@/components/home/types";
import clsx from "clsx";

type VideoCardProps = {
  video: VideoPreview;
  /** Вариант оформления градиента превью (визуальное разделение секций) */
  previewTone?: "neutral" | "cool" | "warm";
  className?: string;
};

const toneClass: Record<NonNullable<VideoCardProps["previewTone"]>, string> = {
  neutral: "from-slate-300/30 via-slate-400/10 to-transparent",
  cool: "from-cyan-500/20 via-blue-500/15 to-indigo-500/20",
  warm: "from-pink-500/15 via-purple-500/10 to-blue-500/15",
};

/**
 * Карточка видео: превью 16:9 + заголовок + мета.
 * На главной повторяется в сетке рекомендаций.
 */
export function VideoCard({
  video,
  previewTone = "cool",
  className,
}: VideoCardProps) {
  return (
    <article
      className={clsx(
        "group rounded-2xl border border-white/10 bg-[#151c2d] p-3 transition hover:border-cyan-400/35",
        className,
      )}
    >
      <div
        className={clsx(
          "aspect-video rounded-xl bg-gradient-to-br",
          toneClass[previewTone],
        )}
      />
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-slate-100">
        {video.title}
      </h3>
      {video.subtitle ? (
        <p className="mt-1 text-xs text-slate-400">{video.subtitle}</p>
      ) : null}
      {video.meta ? (
        <p className="mt-1 text-xs text-slate-400">{video.meta}</p>
      ) : null}
    </article>
  );
}
