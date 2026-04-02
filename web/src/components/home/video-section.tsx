import clsx from "clsx";
import type { ReactNode } from "react";

type VideoSectionProps = {
  /** Заголовок блока на русском */
  title: string;
  /** Необязательная иконка/маркер слева от заголовка */
  titleAdornment?: ReactNode;
  children: React.ReactNode;
  /** Классы сетки для карточек (колонки под разные секции) */
  gridClassName?: string;
  className?: string;
};

/**
 * Секция ленты: заголовок + сетка карточек.
 * Раскладка задаётся через `gridClassName` (например 3 колонки для крупных карточек, 4 — для сетки).
 */
export function VideoSection({
  title,
  titleAdornment,
  children,
  gridClassName = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
  className,
}: VideoSectionProps) {
  return (
    <section className={clsx("space-y-3", className)}>
      <div className="flex items-center gap-2">
        {titleAdornment}
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      </div>
      <div className={gridClassName}>{children}</div>
    </section>
  );
}
