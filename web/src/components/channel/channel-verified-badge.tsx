import clsx from "clsx";
import { BadgeCheck } from "lucide-react";

type ChannelVerifiedBadgeProps = {
  className?: string;
  /** Размер иконки */
  size?: "sm" | "md";
};

export function ChannelVerifiedBadge({ className, size = "md" }: ChannelVerifiedBadgeProps) {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span title="Верифицированный канал" className="inline-flex items-center align-middle text-cyan-400">
      <BadgeCheck className={clsx(iconClass, "shrink-0", className)} aria-hidden />
      <span className="sr-only">Верифицированный канал</span>
    </span>
  );
}
