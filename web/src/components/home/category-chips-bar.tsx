"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Cpu,
  Film,
  Gamepad2,
  GraduationCap,
  Mic,
  Music2,
  Radio,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { HomeCategoryId } from "@/components/home/categories";
import { HOME_FEED_CATEGORIES } from "@/components/home/categories";

type CategoryChipsBarProps = {
  activeCategory: HomeCategoryId;
  onCategoryChange: (categoryId: HomeCategoryId) => void;
};

/** Шаг прокрутки по ширине видимой области */
const SCROLL_STEP = 420;

/**
 * Полоса категорий: стрелки с lg, свайп на мобильных, градиенты при переполнении.
 */
export function CategoryChipsBar({ activeCategory, onCategoryChange }: CategoryChipsBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(max > 2 && scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollByDir = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({
      left: dir * SCROLL_STEP,
      behavior: "smooth",
    });
  };

  const handleSelect = (id: HomeCategoryId) => {
    onCategoryChange(id);
  };

  const getIcon = (id: string) => {
    switch (id) {
      case "all":
        return Radio;
      case "games":
        return Gamepad2;
      case "music":
        return Music2;
      case "recent":
        return Sparkles;
      case "movies":
        return Film;
      case "sport":
        return Trophy;
      case "education":
        return GraduationCap;
      case "comedy":
        return Clapperboard;
      case "tech":
        return Cpu;
      case "podcasts":
        return Mic;
      default:
        return Radio;
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden border-b border-cyan-500/15 bg-gradient-to-r from-[#0a101c]/95 via-[#0d1526]/95 to-[#0a101c]/95 backdrop-blur-md">
      <div className="flex w-full min-w-0 max-w-full items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3 md:px-4 lg:px-6">
        <button
          type="button"
          aria-label="Прокрутить категории влево"
          onClick={() => scrollByDir(-1)}
          disabled={!canScrollLeft}
          className={clsx(
            "hidden h-8 w-8 shrink-0 place-items-center rounded-full border transition sm:h-9 sm:w-9 lg:grid",
            "border-cyan-400/20 bg-slate-950/60 text-cyan-200 shadow-[inset_0_1px_0_rgba(34,211,238,0.12)]",
            canScrollLeft
              ? "hover:border-cyan-300/45 hover:bg-cyan-950/40 hover:text-cyan-50 hover:shadow-[0_0_18px_rgba(34,211,238,0.22)]"
              : "cursor-default opacity-25 hover:border-cyan-400/20 hover:bg-slate-950/60",
          )}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {canScrollLeft ? (
            <div
              className="pointer-events-none absolute left-0 top-0 z-0 h-full w-12 bg-gradient-to-r from-[#0c1528] via-[#0d1526]/85 to-transparent"
              aria-hidden
            />
          ) : null}
          {canScrollRight ? (
            <div
              className="pointer-events-none absolute right-0 top-0 z-0 h-full w-12 bg-gradient-to-l from-[#0c1528] via-[#0d1526]/85 to-transparent"
              aria-hidden
            />
          ) : null}

          <div
            ref={scrollRef}
            className="relative z-10 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Категории видео"
          >
            {HOME_FEED_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelect(cat.id)}
                  className={clsx(
                    "shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium transition",
                    isActive
                      ? "border-cyan-400/50 bg-gradient-to-r from-cyan-500/35 via-sky-600/30 to-blue-700/35 text-cyan-50 shadow-[0_0_22px_rgba(56,189,248,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "border-cyan-500/12 bg-slate-900/40 text-slate-400 hover:border-cyan-400/35 hover:bg-cyan-950/25 hover:text-cyan-100",
                  )}
                >
                  {(() => {
                    const Icon = getIcon(cat.id);
                    return (
                      <span className="inline-flex max-w-none items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">{cat.label}</span>
                      </span>
                    );
                  })()}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Прокрутить категории вправо"
          onClick={() => scrollByDir(1)}
          disabled={!canScrollRight}
          className={clsx(
            "hidden h-8 w-8 shrink-0 place-items-center rounded-full border transition sm:h-9 sm:w-9 lg:grid",
            "border-cyan-400/20 bg-slate-950/60 text-cyan-200 shadow-[inset_0_1px_0_rgba(34,211,238,0.12)]",
            canScrollRight
              ? "hover:border-cyan-300/45 hover:bg-cyan-950/40 hover:text-cyan-50 hover:shadow-[0_0_18px_rgba(34,211,238,0.22)]"
              : "cursor-default opacity-25 hover:border-cyan-400/20 hover:bg-slate-950/60",
          )}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </div>
  );
}
