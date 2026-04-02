import clsx from "clsx";

type ChannelAvatarProps = {
  channelName: string;
  avatarUrl: string | null | undefined;
  /** Под видео — круг как на YouTube; в шапке канала — скруглённый квадрат. */
  variant?: "video" | "channel";
  className?: string;
};

const FALLBACK_GRADIENT =
  "bg-[radial-gradient(circle_at_30%_30%,#82deff_12%,#2d9eff_48%,#0f56be_74%,#0a1d66_100%)]";

/**
 * Единый аватар канала: фото или та же буква на градиенте, что и на странице канала.
 */
export function ChannelAvatar({ channelName, avatarUrl, variant = "video", className }: ChannelAvatarProps) {
  const letter = (channelName.trim().slice(0, 1) || "К").toUpperCase();
  const url = avatarUrl?.trim();

  return (
    <div
      className={clsx(
        "grid shrink-0 place-items-center overflow-hidden border border-white/15 font-semibold text-white",
        !url && FALLBACK_GRADIENT,
        url && "bg-[#0b1323]",
        variant === "channel"
          ? "h-20 w-20 rounded-2xl text-2xl sm:h-24 sm:w-24"
          : "h-11 w-11 rounded-full text-base sm:h-12 sm:w-12 sm:text-lg",
        className,
      )}
      {...(url ? {} : { role: "img" as const, "aria-label": channelName })}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={channelName} className="h-full w-full object-cover" />
      ) : (
        letter
      )}
    </div>
  );
}
